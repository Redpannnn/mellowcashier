"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Crown,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateWIB, formatIDR, formatTimeWIB } from "@/lib/format"
import { safeJson } from "@/lib/api"
import type { ReportData } from "@/lib/types"
import { cn } from "@/lib/utils"

type Period = "day" | "week" | "month"

function wibToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())
}

function wibCurrentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date())
}

function mondayOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+07:00`)
  const wib = new Date(d.getTime() + 7 * 3600 * 1000)
  const dow = wib.getUTCDay()
  const off = dow === 0 ? -6 : 1 - dow
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + off))
    .toISOString()
    .slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00+07:00`)
  // +7 jam supaya tanggal kalender WIB yang diambil dari toISOString
  return new Date(d.getTime() + n * 24 * 3600 * 1000 + 7 * 3600 * 1000)
    .toISOString()
    .slice(0, 10)
}

function rangeLabel(period: Period, date: string, month: string): string {
  if (period === "day") return formatDateWIB(`${date}T00:00:00+07:00`)
  if (period === "week") {
    const mon = mondayOfWeek(date)
    const sun = addDays(mon, 6)
    return `${formatDateWIB(`${mon}T00:00:00+07:00`)} - ${formatDateWIB(`${sun}T00:00:00+07:00`)}`
  }
  const bulan = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00+07:00`))
  return bulan
}

export function ReportsView() {
  const [period, setPeriod] = useState<Period>("day")
  const [date, setDate] = useState(wibToday())
  const [month, setMonth] = useState(wibCurrentMonth())

  const { data, isLoading, isError } = useQuery<ReportData>({
    queryKey: ["reports", period, date, month],
    queryFn: async () => {
      const params =
        period === "month"
          ? `period=month&date=${date}&month=${month}`
          : `period=${period}&date=${date}`
      const res = await fetch(`/api/reports?${params}`)
      if (!res.ok) throw new Error("Gagal memuat laporan")
      return safeJson<ReportData>(res)
    },
  })

  const summary = data?.summary
  const bestSellers = data?.bestSellers ?? []
  const ledger = data?.ledger ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Laporan</h1>
        <p className="text-sm text-muted-foreground">
          Rekap penjualan, belanja stok, dan laba harian / mingguan / bulanan.
        </p>
      </div>

      {/* Filter */}
      <Card className="py-0">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v as Period)}
            className="w-fit"
          >
            <TabsList>
              <TabsTrigger value="day">Harian</TabsTrigger>
              <TabsTrigger value="week">Mingguan</TabsTrigger>
              <TabsTrigger value="month">Bulanan</TabsTrigger>
            </TabsList>
          </Tabs>
          {period === "month" ? (
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full sm:w-56"
              aria-label="Pilih bulan laporan"
            />
          ) : (
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-56"
              aria-label="Pilih tanggal laporan"
            />
          )}
        </CardContent>
      </Card>

      <p className="text-sm font-medium text-muted-foreground">
        <CalendarRange className="mr-1.5 inline size-4 text-primary" />
        Periode: <span className="font-semibold text-foreground">{rangeLabel(period, date, month)}</span>
      </p>

      {/* Ringkasan */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : isError || !summary ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Gagal memuat laporan. Coba refresh halaman.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="py-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                    <TrendingUp className="size-4" />
                  </div>
                  <span className="text-xs font-medium">Total Penjualan</span>
                </div>
                <p className="mt-2 text-lg font-bold sm:text-xl">{formatIDR(summary.totalSales)}</p>
                <p className="text-xs text-muted-foreground">
                  dari {summary.transactionCount} transaksi
                </p>
              </CardContent>
            </Card>

            <Card className="py-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-rose-600">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10">
                    <TrendingDown className="size-4" />
                  </div>
                  <span className="text-xs font-medium">Belanja Stok</span>
                </div>
                <p className="mt-2 text-lg font-bold sm:text-xl">{formatIDR(summary.totalExpense)}</p>
                <p className="text-xs text-muted-foreground">pengeluaran stok</p>
              </CardContent>
            </Card>

            <Card className="py-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-primary">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <Wallet className="size-4" />
                  </div>
                  <span className="text-xs font-medium">Laba Bersih</span>
                </div>
                <p
                  className={cn(
                    "mt-2 text-lg font-bold sm:text-xl",
                    summary.netProfit >= 0 ? "text-foreground" : "text-destructive"
                  )}
                >
                  {formatIDR(summary.netProfit)}
                </p>
                <p className="text-xs text-muted-foreground">pendapatan - belanja stok</p>
              </CardContent>
            </Card>

            <Card className="py-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-600">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <ReceiptText className="size-4" />
                  </div>
                  <span className="text-xs font-medium">Jumlah Transaksi</span>
                </div>
                <p className="mt-2 text-lg font-bold sm:text-xl">{summary.transactionCount}</p>
                <p className="text-xs text-muted-foreground">
                  rata-rata{" "}
                  {formatIDR(
                    summary.transactionCount > 0
                      ? Math.round(summary.totalSales / summary.transactionCount)
                      : 0
                  )}{" "}
                  / transaksi
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            {/* Produk terlaris */}
            <Card className="xl:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Crown className="size-4 text-amber-500" />
                  Produk Paling Laris
                </CardTitle>
                <CardDescription>Berdasarkan jumlah terjual</CardDescription>
              </CardHeader>
              <CardContent>
                {bestSellers.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Belum ada penjualan di periode ini.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {bestSellers.map((b, idx) => (
                      <li key={b.name} className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            idx === 0
                              ? "bg-amber-500 text-white"
                              : idx === 1
                                ? "bg-amber-500/70 text-white"
                                : idx === 2
                                  ? "bg-amber-500/40 text-white"
                                  : "bg-muted text-muted-foreground"
                          )}
                        >
                          {idx + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{b.name}</span>
                        <span className="text-right">
                          <span className="text-sm font-bold">{b.quantity} pcs</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {formatIDR(b.revenue)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Rincian */}
            <Card className="xl:col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Rincian Pendapatan &amp; Belanja</CardTitle>
                <CardDescription>Semua transaksi selama periode terpilih</CardDescription>
              </CardHeader>
              <CardContent>
                {ledger.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Belum ada aktivitas di periode ini.
                  </p>
                ) : (
                  <ul className="scrollbar-thin flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
                    {ledger.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50"
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full",
                            e.type === "income"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-rose-500/10 text-rose-600"
                          )}
                        >
                          {e.type === "income" ? (
                            <ArrowUpRight className="size-4" />
                          ) : (
                            <ArrowDownRight className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{e.description}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {e.detail} - {formatDateWIB(e.createdAt)} {formatTimeWIB(e.createdAt)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-bold",
                            e.type === "income" ? "text-emerald-600" : "text-rose-600"
                          )}
                        >
                          {e.type === "income" ? "+" : "-"}
                          {formatIDR(e.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
