import { NextRequest, NextResponse } from "next/server"
import { db, dbReady } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/products - daftar semua produk
export async function GET() {
  try {
    await dbReady()
    const products = await db.product.findMany({
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json({ products })
  } catch (error) {
    console.error("GET /api/products error:", error)
    return NextResponse.json({ error: "Gagal memuat produk" }, { status: 500 })
  }
}

// POST /api/products - tambah produk baru
export async function POST(req: NextRequest) {
  try {
    await dbReady()
    const body = await req.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const price = Number(body.price)
    const costPrice =
      body.costPrice === undefined || body.costPrice === null ? 0 : Number(body.costPrice)
    const stock = body.stock === undefined || body.stock === null ? 0 : Number(body.stock)
    const image = typeof body.image === "string" ? body.image : ""

    if (!name) {
      return NextResponse.json({ error: "Nama produk wajib diisi" }, { status: 400 })
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 })
    }
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      return NextResponse.json({ error: "Harga beli tidak valid" }, { status: 400 })
    }
    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json({ error: "Stok tidak valid" }, { status: 400 })
    }

    const product = await db.product.create({
      data: { name, price: Math.round(price), costPrice: Math.round(costPrice), stock, image },
    })
    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error("POST /api/products error:", error)
    return NextResponse.json({ error: "Gagal menambah produk" }, { status: 500 })
  }
}
