"use client"

import { useEffect, useState } from "react"
import { Loader2, PackagePlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatIDR, formatThousandInput, parseNumberID } from "@/lib/format"
import type { Product } from "@/lib/types"

export function RestockDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  product: Product | null
  onSuccess: () => void
}) {
  const [qtyInput, setQtyInput] = useState("")
  const [costInput, setCostInput] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setQtyInput("")
      setCostInput("")
      setSaving(false)
    }
  }, [open, product])

  const qty = parseNumberID(qtyInput)
  const cost = parseNumberID(costInput)
  const currentStock = product?.stock ?? 0

  async function save() {
    if (!product) return
    if (qty <= 0) {
      toast.error("Jumlah stok harus lebih dari 0")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${product.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty, cost }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menambah stok")
      toast.success(
        `Stok "${product.name}" bertambah ${qty} pcs${cost > 0 ? ` (belanja ${formatIDR(cost)} tercatat)` : ""}`
      )
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah stok")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="size-5 text-primary" />
            Tambah Stok
          </DialogTitle>
          <DialogDescription>
            {product?.name} — stok sekarang {currentStock} pcs
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-qty">Jumlah stok masuk</Label>
            <Input
              id="rs-qty"
              inputMode="numeric"
              value={qtyInput}
              onChange={(e) => setQtyInput(formatThousandInput(e.target.value))}
              placeholder="0"
              className="h-11"
            />
            {qty > 0 && (
              <p className="text-xs text-muted-foreground">
                Stok jadi <span className="font-semibold text-foreground">{currentStock + qty} pcs</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-cost">Total biaya belanja (opsional)</Label>
            <Input
              id="rs-cost"
              inputMode="numeric"
              value={costInput}
              onChange={(e) => setCostInput(formatThousandInput(e.target.value))}
              placeholder="0"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Biaya pembelian stok ini bakal tercatat sebagai belanja di Laporan.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={save} disabled={saving || qty <= 0}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Simpan Stok
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
