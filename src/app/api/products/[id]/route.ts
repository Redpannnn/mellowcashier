import { NextRequest, NextResponse } from "next/server"
import { db, dbReady } from "@/lib/db"

export const dynamic = "force-dynamic"

// PUT /api/products/[id] - edit produk
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady()
    const { id } = await params
    const body = await req.json()

    const name = typeof body.name === "string" ? body.name.trim() : undefined
    const price = body.price === undefined ? undefined : Number(body.price)
    const image = typeof body.image === "string" ? body.image : undefined
    const stock = body.stock === undefined ? undefined : Number(body.stock)

    if (name !== undefined && !name) {
      return NextResponse.json({ error: "Nama produk wajib diisi" }, { status: 400 })
    }
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 })
    }
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
      return NextResponse.json({ error: "Stok tidak valid" }, { status: 400 })
    }

    const product = await db.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: Math.round(price) }),
        ...(image !== undefined && { image }),
        ...(stock !== undefined && { stock }),
      },
    })
    return NextResponse.json({ product })
  } catch (error) {
    console.error("PUT /api/products/[id] error:", error)
    return NextResponse.json({ error: "Gagal mengubah produk" }, { status: 500 })
  }
}

// DELETE /api/products/[id] - hapus produk
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady()
    const { id } = await params
    await db.product.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error)
    return NextResponse.json({ error: "Gagal menghapus produk" }, { status: 500 })
  }
}
