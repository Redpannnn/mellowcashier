import { NextRequest, NextResponse } from "next/server"
import { db, dbReady } from "@/lib/db"
import { wibDayStart, wibDayEnd, wibWeekRange, wibMonthRange, wibCurrentMonthStr } from "@/lib/wib"

export const dynamic = "force-dynamic"

// GET /api/reports?period=day|week|month&date=YYYY-MM-DD (&month=YYYY-MM untuk period=month)
export async function GET(req: NextRequest) {
  try {
    await dbReady()
    const sp = req.nextUrl.searchParams
    const period = sp.get("period") || "day"
    const date = sp.get("date") || new Date().toISOString().slice(0, 10)

    let start: Date
    let end: Date
    let label = ""

    if (period === "day") {
      start = wibDayStart(date)
      end = wibDayEnd(date)
      label = date
    } else if (period === "week") {
      const w = wibWeekRange(date)
      start = w.start
      end = w.end
      label = w.mondayStr
    } else {
      const month = sp.get("month") || date.slice(0, 7) || wibCurrentMonthStr()
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: "Format bulan tidak valid" }, { status: 400 })
      }
      const r = wibMonthRange(month)
      start = r.start
      end = r.end
      label = month
    }

    const [transactions, expenses] = await Promise.all([
      db.transaction.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      db.expense.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: "desc" },
      }),
    ])

    const totalSales = transactions.reduce((s, t) => s + t.total, 0)
    const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)
    const netProfit = totalSales - totalExpense

    // Produk terlaris
    const sellerMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    for (const t of transactions) {
      for (const item of t.items) {
        const key = item.productId || item.name
        const prev = sellerMap.get(key) || { name: item.name, quantity: 0, revenue: 0 }
        prev.quantity += item.quantity
        prev.revenue += item.price * item.quantity
        sellerMap.set(key, prev)
      }
    }
    const bestSellers = Array.from(sellerMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8)

    // Ledger gabungan: pendapatan + belanja stok
    const ledger = [
      ...transactions.map((t) => ({
        type: "income" as const,
        id: `trx-${t.id}`,
        description: `Penjualan ${t.code}`,
        detail: `${t.items.reduce((s, i) => s + i.quantity, 0)} item - ${t.paymentMethod}`,
        amount: t.total,
        createdAt: t.createdAt,
      })),
      ...expenses.map((e) => ({
        type: "expense" as const,
        id: `exp-${e.id}`,
        description: e.description,
        detail: "Belanja stok",
        amount: e.amount,
        createdAt: e.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      period,
      label,
      summary: { totalSales, totalExpense, netProfit, transactionCount: transactions.length },
      bestSellers,
      ledger,
    })
  } catch (error) {
    console.error("GET /api/reports error:", error)
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 })
  }
}
