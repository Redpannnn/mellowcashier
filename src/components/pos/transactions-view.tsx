"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Banknote,
  CalendarRange,
  ChevronDown,
  Printer,
  QrCode,
  ReceiptText,
  Search,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateTimeWIB, formatIDR } from "@/lib/format"
import type { Trx } from "@/lib/types"
import { cn } from "@/lib/utils"
import { NotaDialog } from "./nota-dialog"

function wibCurrentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date())
}

export function TransactionsView() {
  const [mode, setMode] = useState<"month" | "range">("month")
  const [month, setMonth] = useState(wibCurrentMonth())
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [notaTrx, setNotaTrx] = useState<Trx | null>(null)

  const rangeReady = mode === "range" && from && to && from <= to
  const queryKey = ["transactions", mode, month, from, to]

  const { data, isLoading, isError } = useQuery<{
    transactions: Trx[]
    totalSales: number
  }>({
    queryKey,
    queryFn: async () => {
      const params =
        mode === "range" && rangeReady
          ? `mode=range&from=${from}&to=${to}`
          : `mode=month&month=${month}`
      const res = await fetch(`/api/transactions?${params}`)
      if (!res.ok) throw new Error("Gagal memuat transaksi")
      return res.json()
    },
    enabled: mode === "month" || rangeReady,
  })

  const transactions = data?.transactions ?? []

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return transactions
    return transactions.filter(
      (t) =>
        t.code.toLowerCase().includes(q) ||
        t.items.some((i) => i.name.toLowerCase().includes(q))
    )
  }, [transactions, search])

  const filteredTotal = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.total, 0),
    [filteredTransactions]
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Transaksi</h1>
        <p className="text-sm text-muted-foreground">
          Riwayat semua penjualan. Default tampil per bulan ini.
        </p>
      </div>

      {/* Filter */}
      <Card className="py-0">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              value={mode}
              onValueChange={(v) => setMode(v as "month" | "range")}
              className="w-fit"
            >
              <TabsList>
                <TabsTrigger value="month" className="gap-1.5">
                  <CalendarRange className="size-4" />
                  Per Bulan
                </TabsTrigger>
                <TabsTrigger value="range" className="gap-1.5">
                  <CalendarRange className="size-4" />
                  Rentang Tanggal
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === "month" ? (
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full sm:w-56"
                aria-label="Pilih bulan"
              />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full sm:w-44"
                  aria-label="Dari tanggal"
                />
                <span className="text-sm text-muted-foreground">s/d</span>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full sm:w-44"
                  aria-label="Sampai tanggal"
                />
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode transaksi atau nama produk..."
              className="pl-9"
              aria-label="Cari transaksi"
            />
          </div>

          {mode === "range" && from && to && from > to && (
            <p className="text-xs font-medium text-destructive">
              Tanggal &quot;dari&quot; tidak boleh lebih besar dari tanggal &quot;sampai&quot;.
            </p>
          )}

          {filteredTransactions.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <span className="font-medium">
                {filteredTransactions.length} transaksi
              </span>
              <Separator orientation="vertical" className="hidden h-4 sm:block" />
              <span className="text-muted-foreground">
                Total penjualan:{" "}
                <span className="font-bold text-primary">{formatIDR(filteredTotal)}</span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List transaksi */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Gagal memuat transaksi.
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <ReceiptText className="size-8 opacity-50" />
          <p>Belum ada transaksi pada periode ini.</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Search className="size-8 opacity-50" />
          <p>Tidak ada transaksi yang cocok dengan &quot;{search}&quot;.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredTransactions.map((t) => {
            const open = expanded === t.id
            const totalQty = t.items.reduce((s, i) => s + i.quantity, 0)
            return (
              <li key={t.id}>
                <Card className="py-0 transition-colors">
                  <CardContent className="p-0">
                    <button
                      className="flex w-full items-center gap-3 p-4 text-left"
                      onClick={() => setExpanded(open ? null : t.id)}
                      aria-expanded={open}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{t.code}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1",
                              t.paymentMethod === "QRIS"
                                ? "border-primary/30 bg-primary/5 text-primary"
                                : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
                            )}
                          >
                            {t.paymentMethod === "QRIS" ? (
                              <QrCode className="size-3" />
                            ) : (
                              <Banknote className="size-3" />
                            )}
                            {t.paymentMethod}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTimeWIB(t.createdAt)} - {totalQty} item
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold">{formatIDR(t.total)}</span>
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform",
                            open && "rotate-180"
                          )}
                        />
                      </div>
                    </button>

                    {open && (
                      <div className="border-t bg-muted/30 px-4 py-3">
                        <ul className="flex flex-col gap-1.5">
                          {t.items.map((i) => (
                            <li key={i.id} className="flex justify-between gap-2 text-sm">
                              <span className="min-w-0 flex-1 truncate">
                                {i.name}{" "}
                                <span className="text-xs text-muted-foreground">
                                  ({i.quantity} x {formatIDR(i.price)})
                                </span>
                              </span>
                              <span className="font-medium">
                                {formatIDR(i.price * i.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <Separator className="my-2.5" />
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-bold">{formatIDR(t.total)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dibayar ({t.paymentMethod})</span>
                            <span>{formatIDR(t.paidAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Kembalian</span>
                            <span>{formatIDR(t.changeAmount)}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setNotaTrx(t)}
                        >
                          <Printer className="size-3.5" />
                          Nota &amp; Print
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <NotaDialog
        open={notaTrx !== null}
        onOpenChange={(v) => !v && setNotaTrx(null)}
        transaction={notaTrx}
      />
    </div>
  )
}
