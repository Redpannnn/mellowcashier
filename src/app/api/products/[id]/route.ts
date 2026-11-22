import { NextRequest, NextResponse } from "next/server"
import { db, dbReady } from "@/lib/db"

export const dynamic = "force-dynamic"

// POST /api/products/[id]/restock - tambah stok produk + catat biaya belanja
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady()
    const { id } = await params
    const body = await req.json()
    const quantity = Number(body.quantity)
    const cost = body.cost === undefined || body.cost === null ? 0 : Number(body.cost)

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Jumlah stok harus lebih dari 0" }, { status: 400 })
    }
    if (!Number.isFinite(cost) || cost < 0) {
      return NextResponse.json({ error: "Biaya belanja tidak valid" }, { status: 400 })
    }

    const product = await db.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 })
    }

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: { stock: { increment: quantity } },
      })

      let expense = null
      if (cost > 0) {
        expense = await tx.expense.create({
          data: {
            description: `Belanja stok: ${product.name} (+${quantity} pcs)`,
            amount: Math.round(cost),
          },
        })
      }

      return { product: updated, expense }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("POST /api/products/[id]/restock error:", error)
    return NextResponse.json({ error: "Gagal menambah stok" }, { status: 500 })
  }
}
