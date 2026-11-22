"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  Boxes,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { safeJson } from "@/lib/api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatIDR } from "@/lib/format"
import type { Product } from "@/lib/types"
import { ProductImage } from "./product-image"
import { ProductFormDialog } from "./product-form-dialog"
import { RestockDialog } from "./restock-dialog"

export function StockView() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery<{ products: Product[] }>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products")
      if (!res.ok) throw new Error("Gagal memuat produk")
      return safeJson<{ products: Product[] }>(res)
    },
  })

  const products = data?.products ?? []

  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [restockProduct, setRestockProduct] = useState<Product | null>(null)
  const [restockOpen, setRestockOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["products"] })
    queryClient.invalidateQueries({ queryKey: ["reports"] })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: "DELETE" })
      const data = await safeJson<{ ok?: boolean; error?: string }>(res)
      if (!res.ok) throw new Error(data.error || "Gagal menghapus produk")
      toast.success(`Produk "${deleteTarget.name}" dihapus`)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus produk")
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Stok Produk</h1>
          <p className="text-sm text-muted-foreground">
            Kelola produk, tambah stok masuk, dan catat biaya belanjanya.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-60">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="pl-9"
              aria-label="Cari produk"
            />
          </div>
          <Button
            onClick={() => {
              setEditingProduct(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            Tambah Produk
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl sm:h-28" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Gagal memuat produk. Coba refresh halaman.
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Boxes className="size-8 opacity-50" />
          <p>Belum ada produk. Klik &quot;Tambah Produk&quot; untuk mulai jualan.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Search className="size-8 opacity-50" />
          <p>Tidak ada produk yang cocok dengan &quot;{search}&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="py-0">
              <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:p-4">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl border sm:aspect-auto sm:size-24 sm:w-24 sm:shrink-0">
                  <ProductImage src={p.image} alt={p.name} sizes="(max-width: 640px) 50vw, 96px" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</p>
                    {p.stock <= 0 ? (
                      <Badge variant="destructive" className="shrink-0">
                        Habis
                      </Badge>
                    ) : p.stock <= 5 ? (
                      <Badge className="shrink-0 bg-amber-500 text-white hover:bg-amber-500">
                        <AlertTriangle className="size-3" />
                        Stok {p.stock}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        Stok {p.stock}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-bold text-primary">{formatIDR(p.price)}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setRestockProduct(p)
                        setRestockOpen(true)
                      }}
                    >
                      <PackagePlus className="size-3.5" />
                      Tambah Stok
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingProduct(p)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="size-3.5" />
                      Hapus
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSuccess={refresh}
      />
      <RestockDialog
        open={restockOpen}
        onOpenChange={setRestockOpen}
        product={restockProduct}
        onSuccess={refresh}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk &quot;{deleteTarget?.name}&quot; akan dihapus permanen. Riwayat transaksi lama
              tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
