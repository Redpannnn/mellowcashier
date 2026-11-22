"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Printer } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  isBluetoothSupported,
  printReceiptBluetooth,
} from "@/lib/bluetooth-printer"
import { formatDateTimeWIB, formatIDR } from "@/lib/format"
import type { Trx } from "@/lib/types"

export function NotaDialog({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  transaction: Trx | null
}) {
  const [printing, setPrinting] = useState(false)

  if (!transaction) return null

  const { code, createdAt, items, total, paymentMethod, paidAmount, changeAmount } = transaction

  /** Satu tombol print: kirim ke printer thermal Bluetooth, fallback ke print browser */
  async function handlePrint() {
    if (!isBluetoothSupported()) {
      // Browser tanpa Web Bluetooth (mis. Safari/iPhone) → pakai dialog print browser
      window.print()
      return
    }
    setPrinting(true)
    try {
      const name = await printReceiptBluetooth(transaction)
      toast.success(`Struk terkirim ke ${name}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal print via Bluetooth"
      toast.error(msg, {
        duration: 8000,
        action: { label: "Print Browser", onClick: () => window.print() },
      })
    } finally {
      setPrinting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-7" />
          </div>
          <DialogTitle className="mt-1">Pembayaran Berhasil</DialogTitle>
          <DialogDescription>Transaksi sudah tersimpan, nota siap dicetak.</DialogDescription>
        </DialogHeader>

        {/* Struk */}
        <div
          id="print-nota"
          className="mx-auto w-full max-w-[280px] rounded-xl border bg-white p-4 font-mono text-[13px] text-black shadow-sm"
        >
          <div className="text-center">
            <img
              src="/logo.png"
              alt="MELLOW"
              className="mx-auto h-14 w-auto object-contain"
            />
            <p className="text-[11px]">Struk Penjualan</p>
          </div>
          <div className="my-2 border-t border-dashed border-black/40" />
          <div className="flex justify-between text-[11px]">
            <span>{code}</span>
            <span>{formatDateTimeWIB(createdAt)}</span>
          </div>
          <div className="my-2 border-t border-dashed border-black/40" />
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => (
              <li key={item.id}>
                <p className="truncate">{item.name}</p>
                <p className="flex justify-between text-[12px]">
                  <span>
                    {item.quantity} x {formatIDR(item.price)}
                  </span>
                  <span className="font-semibold">{formatIDR(item.price * item.quantity)}</span>
                </p>
              </li>
            ))}
          </ul>
          <div className="my-2 border-t border-dashed border-black/40" />
          <p className="flex justify-between text-sm font-bold">
            <span>TOTAL</span>
            <span>{formatIDR(total)}</span>
          </p>
          <p className="flex justify-between">
            <span>{paymentMethod === "QRIS" ? "QRIS" : "CASH"}</span>
            <span>{formatIDR(paidAmount)}</span>
          </p>
          <p className="flex justify-between">
            <span>Kembali</span>
            <span>{formatIDR(changeAmount)}</span>
          </p>
          <div className="my-2 border-t border-dashed border-black/40" />
          <p className="text-center text-[11px]">Terima kasih sudah berbelanja!</p>
        </div>

        {/* Aksi */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handlePrint}
            disabled={printing}
            title="Cetak ke printer thermal Bluetooth (atau print browser)"
          >
            {printing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Printer className="size-4" />
            )}
            {printing ? "Mengirim..." : "Print Nota"}
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            Selesai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
