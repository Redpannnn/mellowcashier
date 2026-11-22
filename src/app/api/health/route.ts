import { NextResponse } from "next/server"
import { createClient } from "@libsql/client"

export const dynamic = "force-dynamic"

/** Bersihin nilai env: buang spasi & tanda kutip yang sering kebawa pas paste di Vercel */
function cleanEnv(value: string | undefined): string | undefined {
  const v = value?.trim().replace(/^["']|["']$/g, "")
  return v ? v : undefined
}

/**
 * GET /api/health — diagnosa database.
 * Buka URL ini di browser (mis. https://nama-app.vercel.app/api/health) buat cek:
 * - Koneksi ke Turso jalan atau engga
 * - Prisma bisa query atau engga
 * - Tabel Product + kolom costPrice udah ada atau belum
 * Endpoint ini ga ngedit data apa pun dan ga ngeleak token.
 */
export async function GET() {
  const tursoUrl = cleanEnv(process.env.TURSO_DATABASE_URL)
  const tursoToken = cleanEnv(
    process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN
  )
  const mode = tursoUrl ? "turso" : "sqlite-local"

  const result: Record<string, unknown> = {
    mode,
    databaseUrl: tursoUrl || cleanEnv(process.env.DATABASE_URL) || null,
    authToken: tursoUrl ? (tursoToken ? "diset" : "TIDAK DISSET") : null,
  }

  if (tursoUrl) {
    // 1. Tes koneksi mentah libSQL (independen dari Prisma)
    try {
      const client = createClient({ url: tursoUrl, authToken: tursoToken })
      await client.execute("SELECT 1")

      // 2. Cek struktur tabel
      try {
        const cols = await client.execute(`PRAGMA table_info("Product")`)
        const names = cols.rows.map((r) => String(r.name))
        result.tabelProduct = "ada"
        result.kolomCostPrice = names.includes("costPrice") ? "ada" : "BELUM ADA"
      } catch (err) {
        result.tabelProduct = "BELUM ADA (bakal dibuat otomatis saat request pertama)"
        result.detailStruktur = String(err).slice(0, 200)
      }

      client.close()
      result.connection = "OK"
    } catch (err) {
      result.connection = "GAGAL"
      result.connectionError = String(err).slice(0, 300)
    }

    // 3. Tes query lewat Prisma (path yang dipake API asli)
    try {
      const { db } = await import("@/lib/db")
      const count = await db.product.count()
      result.prisma = `OK (${count} produk)`
    } catch (err) {
      result.prisma = "GAGAL"
      result.prismaError = String(err).slice(0, 300)
    }
  } else {
    // Mode file lokal: cek Prisma langsung
    try {
      const { db } = await import("@/lib/db")
      const count = await db.product.count()
      result.prisma = `OK (${count} produk)`
    } catch (err) {
      result.prisma = "GAGAL"
      result.prismaError = String(err).slice(0, 300)
    }
  }

  return NextResponse.json(result)
}
