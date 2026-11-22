"use client"

import { useEffect, useRef, useState } from "react"
import { ImageIcon, Loader2, Pencil, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { safeJson } from "@/lib/api"
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

/** Resize gambar di browser (maks 512px, JPEG) lalu balikin data URL */
async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmapUrl = URL.createObjectURL(file)
  try {
    const img = document.createElement("img")
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("File bukan gambar yang valid"))
      img.src = bitmapUrl
    })
    const max = 512
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Gagal memproses gambar")
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL("image/jpeg", 0.82)
  } finally {
    URL.revokeObjectURL(bitmapUrl)
  }
}

export function ProductFormDialog({
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
  const isEdit = Boolean(product)
  const [name, setName] = useState("")
  const [priceInput, setPriceInput] = useState("")
  const [costInput, setCostInput] = useState("")
  const [stockInput, setStockInput] = useState("")
  const [image, setImage] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "")
      setPriceInput(product ? product.price.toLocaleString("id-ID") : "")
      setCostInput(product && product.costPrice > 0 ? product.costPrice.toLocaleString("id-ID") : "")
      setStockInput("")
      setImage(product?.image ?? "")
      setUploading(false)
      setSaving(false)
    }
  }, [open, product])

  /** Resize gambar di browser + jadikan data URL, biar bisa disimpan langsung ke database
   *  (aman untuk hosting serverless seperti Vercel yang filesystem-nya read-only) */
  async function handleUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB")
      return
    }
    setUploading(true)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      setImage(dataUrl)
      toast.success("Foto produk siap disimpan")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses gambar")
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    const price = parseNumberID(priceInput)
    const costPrice = parseNumberID(costInput)
    if (!name.trim()) {
      toast.error("Nama produk wajib diisi")
      return
    }
    if (price <= 0) {
      toast.error("Harga harus lebih dari 0")
      return
    }
    if (costPrice < 0) {
      toast.error("Harga beli tidak valid")
      return
    }
    const stock = parseNumberID(stockInput)

    setSaving(true)
    try {
      const res = await fetch(isEdit ? `/api/products/${product!.id}` : "/api/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { name: name.trim(), price, costPrice, image }
            : { name: name.trim(), price, costPrice, image, stock }
        ),
      })
      const data = await safeJson<{ product?: Product; error?: string }>(res)
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan produk")
      toast.success(isEdit ? "Produk berhasil diubah" : "Produk berhasil ditambah")
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan produk")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && !uploading && onOpenChange(v)}>
      <DialogContent className="scrollbar-thin max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ubah detail produk. Untuk nambah stok, pakai tombol Tambah Stok."
              : "Isi detail produk baru untuk tokomu."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Foto */}
          <div className="flex items-center gap-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-muted">
              {image ? (
                <img src={image} alt="Preview produk" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-7" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(f)
                  e.target.value = ""
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Upload Foto
              </Button>
              {image && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setImage("")}
                >
                  <X className="size-4" />
                  Hapus foto
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground">JPG/PNG/WEBP maks 5MB, otomatis dikecilkan</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-nama">Nama produk</Label>
            <Input
              id="pf-nama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Es Kopi Susu"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-harga">Harga jual</Label>
            <Input
              id="pf-harga"
              inputMode="numeric"
              value={priceInput}
              onChange={(e) => setPriceInput(formatThousandInput(e.target.value))}
              placeholder="0"
              className="h-11"
            />
            {priceInput && (
              <p className="text-xs text-muted-foreground">{formatIDR(parseNumberID(priceInput))}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-harga-beli">Harga beli awal</Label>
            <Input
              id="pf-harga-beli"
              inputMode="numeric"
              value={costInput}
              onChange={(e) => setCostInput(formatThousandInput(e.target.value))}
              placeholder="0"
              className="h-11"
            />
            {costInput && (
              <p className="text-xs text-muted-foreground">{formatIDR(parseNumberID(costInput))}</p>
            )}
          </div>

          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pf-stok">Stok awal</Label>
              <Input
                id="pf-stok"
                inputMode="numeric"
                value={stockInput}
                onChange={(e) => setStockInput(formatThousandInput(e.target.value))}
                placeholder="0"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={save} disabled={saving || uploading}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Simpan" : "Tambah Produk"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
