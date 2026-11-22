"use client"

import { useEffect, useState } from "react"
import { Banknote, Loader2, QrCode, Wallet, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatIDR, formatNumberID, formatThousandInput, parseNumberID } from "@/lib/format"
import { useCartStore } from "@/store/cart"
import type { Trx } from "@/lib/types"

type PaymentMethod = "QRIS" | "CASH"

export function CheckoutDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: (trx: Trx) => void
}) {
  const items = useCartStore((s) => s.items)
  const clear = useCartStore((s) => s.clear)

  const [method, setMethod] = useState<PaymentMethod>("CASH")
  const [paidInput, setPaidInput] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const paid = parseNumberID(paidInput)
  const change = paid - total

  // Reset setiap kali dialog dibuka
  useEffect(() => {
    if (open) {
      setMethod("CASH")
      setPaidInput("")
      setSubmitting(false)
    }
  }, [open])

  async function pay() {
    setSubmitting(true)
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
          paymentMethod: method,
          paidAmount: paid,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses pembayaran")
      }
      onSuccess(data.transaction as Trx)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses pembayaran")
      setSubmitting(false)
    }
  }

  const insufficient = paid < total

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="scrollbar-thin max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription>
            Periksa pesanan, pilih metode bayar, lalu klik Bayar.
          </DialogDescription>
        </DialogHeader>

        {/* Ringkasan pesanan */}
        <div className="rounded-xl bg-muted/60 p-3">
          <ScrollArea className="max-h-36 pr-2">
            <ul className="flex flex-col gap-1.5">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {i.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({i.qty} x {formatIDR(i.price)})
                    </span>
                  </span>
                  <span className="font-medium">{formatIDR(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
          <Separator className="my-2.5" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold text-primary">{formatIDR(total)}</span>
          </div>
        </div>

        {/* Metode pembayaran */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={method === "QRIS"}
            onClick={() => setMethod("QRIS")}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
              method === "QRIS"
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "hover:bg-accent"
            )}
          >
            {method === "QRIS" && (
              <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </span>
            )}
            <QrCode className="size-7 text-primary" />
            <span className="text-sm font-semibold">QRIS</span>
            <span className="text-[11px] text-muted-foreground">Scan dari HP lain</span>
          </button>
          <button
            type="button"
            aria-pressed={method === "CASH"}
            onClick={() => setMethod("CASH")}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
              method === "CASH"
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "hover:bg-accent"
            )}
          >
            {method === "CASH" && (
              <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </span>
            )}
            <Banknote className="size-7 text-primary" />
            <span className="text-sm font-semibold">Cash</span>
            <span className="text-[11px] text-muted-foreground">Uang tunai</span>
          </button>
        </div>

        {/* Nominal dibayar (QRIS & CASH) */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nominal" className="text-sm font-medium">
              Nominal dibayar
            </label>
            <Input
              id="nominal"
              inputMode="numeric"
              placeholder="0"
              value={paidInput}
              onChange={(e) => setPaidInput(formatThousandInput(e.target.value))}
              className="h-11 text-lg font-semibold"
            />
            {method === "QRIS" && (
              <p className="text-xs text-muted-foreground">
                Customer scan QRIS dari HP mereka, lalu isi nominal yang dibayar.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPaidInput(formatNumberID(total))}
            >
              Uang pas
            </Button>
            {[50000, 100000, 200000].map((v) => (
              <Button
                key={v}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaidInput(formatNumberID(v))}
              >
                {formatIDR(v)}
              </Button>
            ))}
          </div>
        </div>

        {/* Kembalian */}
        <div
          className={cn(
            "flex items-center justify-between rounded-xl px-4 py-3",
            insufficient
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          )}
        >
          <span className="text-sm font-medium">
            {insufficient ? "Kurang bayar" : "Kembalian"}
          </span>
          <span className="text-lg font-bold">
            {insufficient ? formatIDR(Math.abs(change)) : formatIDR(Math.max(change, 0))}
          </span>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={insufficient || submitting || items.length === 0}
          onClick={pay}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <Wallet className="size-4" />
              Bayar {formatIDR(total)}
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
