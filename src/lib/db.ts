import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

/**
 * Dual-mode database:
 * - Kalau TURSO_DATABASE_URL diset (mis. libsql://xxx.turso.io) → pakai Turso/libSQL
 * - Kalau tidak → pakai SQLite file lokal (untuk development)
 *
 * Di Vercel cukup set 2 env var:
 *   TURSO_DATABASE_URL = libsql://nama-db-org.turso.io
 *   TURSO_AUTH_TOKEN   = (token dari Turso dashboard)
 * Tabel dibuat otomatis saat request pertama (tidak perlu jalankan command apa pun).
 */

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN

function createDb(): PrismaClient {
  if (tursoUrl) {
    // Adapter libSQL untuk Prisma (v6): terima config object, client dibuat internal.
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoToken,
    })
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
    })
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? createDb()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ---------------------------------------------------------------------------
// Auto-migration: buat tabel kalau belum ada (hanya mode Turso).
// DDL dijalankan langsung via libSQL client (bukan $executeRawUnsafe) supaya
// tidak kena validasi URL datasource Prisma.
// Mirroring prisma/schema.prisma, idempotent (IF NOT EXISTS).
// ---------------------------------------------------------------------------

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paidAmount" INTEGER NOT NULL,
    "changeAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_code_key" ON "Transaction" ("code")`,
  `CREATE TABLE IF NOT EXISTS "TransactionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "TransactionItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "TransactionItem_transactionId_idx" ON "TransactionItem" ("transactionId")`,
  `CREATE INDEX IF NOT EXISTS "Transaction_createdAt_idx" ON "Transaction" ("createdAt")`,
  `CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
]

const globalForSchema = globalThis as unknown as {
  kasirkuSchemaReady: Promise<void> | undefined
}

/** Dipanggil di awal tiap API handler; no-op di mode file lokal (tabel dibuat via prisma db push) */
export function dbReady(): Promise<void> {
  if (!tursoUrl) return Promise.resolve()
  if (!globalForSchema.kasirkuSchemaReady) {
    globalForSchema.kasirkuSchemaReady = (async () => {
      const client = createClient({
        url: tursoUrl,
        authToken: tursoToken,
      })
      for (const stmt of SCHEMA_STATEMENTS) {
        await client.execute(stmt)
      }
      client.close()
    })().catch((err) => {
      globalForSchema.kasirkuSchemaReady = undefined
      throw err
    })
  }
  return globalForSchema.kasirkuSchemaReady
}
