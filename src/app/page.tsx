"use client"

import { useState } from "react"
import { BottomNav, TopNav, type TabKey } from "@/components/pos/navbar"
import { Providers } from "@/components/pos/providers"
import { CashierView } from "@/components/pos/cashier-view"
import { StockView } from "@/components/pos/stock-view"
import { TransactionsView } from "@/components/pos/transactions-view"
import { ReportsView } from "@/components/pos/reports-view"

export default function Home() {
  const [tab, setTab] = useState<TabKey>("produk")

  return (
    <Providers>
      <div className="flex min-h-dvh flex-col">
        <TopNav active={tab} onChange={setTab} />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-4 sm:pb-8 sm:pt-6">
          {tab === "produk" && <CashierView />}
          {tab === "stok" && <StockView />}
          {tab === "transaksi" && <TransactionsView />}
          {tab === "laporan" && <ReportsView />}
        </main>

        <footer className="mt-auto hidden border-t py-4 text-center text-xs text-muted-foreground sm:block">
          KasirKu — aplikasi kasir sederhana untuk UMKM
        </footer>

        <BottomNav active={tab} onChange={setTab} />
      </div>
    </Providers>
  )
}
