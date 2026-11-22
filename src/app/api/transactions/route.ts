import { NextRequest, NextResponse } from "next/server"
import { db, dbReady } from "@/lib/db"
import { makeTrxCode, wibMonthRange, wibDayStart, wibDayEnd } from "@/lib/wib"

export const dynamic = "force-dynamic"

// GET /api/transactions?mode=month&month=YYYY-MM
// GET /api/transactions?mode=range&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    await dbReady()
    const sp = req.nextUrl.searchParams
    const mode = sp.get("mode") || "month"

    let start: Date
    let end: Date

    if (mode === "range") {
      const from = sp.get("from")
      const to = sp.get("to")
      if (!from || !to) {
        return NextResponse.json({ error: "Tanggal dari & sampai wajib diisi" }, { status: 400 })
      }
      start = wibDayStart(from)
      end = wibDayEnd(to)
    } else {
      const month = sp.get("month")
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: "Format bulan tidak valid" }, { status: 400 })
      }
      const range = wibMonthRange(month)
      start = range.start
      end = range.end
    }

    const transactions = await db.transaction.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    })

    const totalSales = transactions.reduce((s, t) => s + t.total, 0)
    return NextResponse.json({ transactions, totalSales })
  } catch (error) {
    console.error("GET /api/transactions error:", error)
    return NextResponse.json({ error: "Gagal memuat transaksi" }, { status: 500 })
  }
}

type CartPayload = { productId: string; quantity: number }

// POST /api/transactions - buat transaksi baru (kasir)
export async function POST(req: NextRequest) {
  try {
    await dbReady()
    const body = await req.json()
    const items: CartPayload[] = Array.isArray(body.items) ? body.items : []
    const paymentMethod = body.paymentMethod === "QRIS" ? "QRIS" : body.paymentMethod === "CASH" ? "CASH" : null
    let paidAmount = Number(body.paidAmount)

    if (items.length === 0) {
      return NextResponse.json({ error: "Tidak ada produk yang dipilih" }, { status: 400 })
    }
    if (!paymentMethod) {
      return NextResponse.json({ error: "Metode pembayaran tidak valid" }, { status: 400 })
    }

    // Gabungkan quantity per produk
    const qtyMap = new Map<string, number>()
    for (const it of items) {
      const q = Number(it.quantity)
      if (!Number.isInteger(q) || q <= 0) {
        return NextResponse.json({ error: "Jumlah produk tidak valid" }, { status: 400 })
      }
      qtyMap.set(it.productId, (qtyMap.get(it.productId) || 0) + q)
    }

    // Ambil produk dari DB
    const productIds = Array.from(qtyMap.keys())
    const products = await db.product.findMany({ where: { id: { in: productIds } } })
    const productMap = new Map(products.map((p) => [p.id, p]))

    let total = 0
    const itemData: { productId: string; name: string; price: number; quantity: number }[] = []
    for (const [productId, quantity] of qtyMap) {
      const p = productMap.get(productId)
      if (!p) {
        return NextResponse.json({ error: "Ada produk yang tidak ditemukan" }, { status: 400 })
      }
      if (p.stock < quantity) {
        return NextResponse.json(
          { error: `Stok "${p.name}" tidak cukup (sisa ${p.stock})` },
          { status: 400 }
        )
      }
      total += p.price * quantity
      itemData.push({ productId: p.id, name: p.name, price: p.price, quantity })
    }

    if (!Number.isFinite(paidAmount) || paidAmount < total) {
      return NextResponse.json(
        { error: "Nominal bayar kurang dari total" },
        { status: 400 }
      )
    }
    const changeAmount = paidAmount - total

    // Buat kode unik
    let code = makeTrxCode()
    for (let i = 0; i < 5; i++) {
      const exists = await db.transaction.findUnique({ where: { code } })
      if (!exists) break
      code = makeTrxCode()
    }

    const transaction = await db.$transaction(async (tx) => {
      for (const item of itemData) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }
      return tx.transaction.create({
        data: {
          code,
          total,
          paymentMethod,
          paidAmount: Math.round(paidAmount),
          changeAmount,
          items: {
            create: itemData.map((i) => ({
              productId: i.productId,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      })
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error("POST /api/transactions error:", error)
    return NextResponse.json({ error: "Gagal memproses pembayaran" }, { status: 500 })
  }
}
