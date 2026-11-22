"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Search, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { formatIDR } from "@/lib/format"
import type { Product, Trx } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useCartStore } from "@/store/cart"
import { CartPanel, CartTotalBadge } from "./cart-panel"
import { CheckoutDialog } from "./checkout-dialog"
import { NotaDialog } from "./nota-dialog"
import { ProductImage } from "./product-image"

export function CashierView() {
  const queryClient = useQueryClient()
  const items = useCartStore((s) => s.items)
  const add = useCartStore((s) => s.add)

  const [search, setSearch] = useState("")
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [notaOpen, setNotaOpen] = useState(false)
  const [lastTrx, setLastTrx] = useState<Trx | null>(null)

  const { data, isLoading, isError } = useQuery<{ products: Product[] }>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products")
      if (!res.ok) throw new Error("Gagal memuat produk")
      return res.json()
    },
  })

  const products = data?.products ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const { total, totalQty, count } = CartTotalBadge()
  const qtyOf = (id: string) => items.find((i) => i.id === id)?.qty ?? 0

  function handleAdd(p: Product) {
    const ok = add(p)
    if (!ok) {
      toast.warning(p.stock <= 0 ? `"${p.name}" sedang habis` : `Stok "${p.name}" cuma ${p.stock}`)
    }
  }

  function handleSuccess(trx: Trx) {
    setCheckoutOpen(false)
    setMobileCartOpen(false)
    useCartStore.getState().clear()
    setLastTrx(trx)
    setNotaOpen(true)
    queryClient.invalidateQueries({ queryKey: ["products"] })
    queryClient.invalidateQueries({ queryKey: ["transactions"] })
    queryClient.invalidateQueries({ queryKey: ["reports"] })
    toast.success(`Transaksi ${trx.code} berhasil!`)
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Grid produk */}
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Produk</h1>
            <p className="text-sm text-muted-foreground">
              Klik produk untuk masuk ke pesanan, lalu checkout.
            </p>
          </div>
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="pl-9"
              aria-label="Cari produk"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-xl border p-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Gagal memuat produk. Coba refresh halaman.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            {products.length === 0
              ? "Belum ada produk. Tambah produk lewat menu Stok ya."
              : `Tidak ada produk yang cocok dengan "${search}".`}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-4">
            {filtered.map((p) => {
              const inCart = qtyOf(p.id)
              const habis = p.stock <= 0
              return (
                <button
                  key={p.id}
                  onClick={() => handleAdd(p)}
                  disabled={habis}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-xs transition-all",
                    habis
                      ? "cursor-not-allowed opacity-60"
                      : "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                  aria-label={`Tambah ${p.name} ke pesanan`}
                >
                  <div className="relative aspect-square w-full overflow-hidden">
                    <ProductImage src={p.image} alt={p.name} />
                    {inCart > 0 && (
                      <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow sm:right-2 sm:top-2 sm:size-6 sm:text-xs">
                        {inCart}
                      </span>
                    )}
                    {habis && (
                      <span className="absolute inset-x-0 bottom-0 bg-destructive/90 py-1 text-center text-xs font-semibold text-white">
                        Habis
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-2 sm:p-3">
                    <p className="line-clamp-2 text-xs font-medium leading-snug sm:text-sm">
                      {p.name}
                    </p>
                    <p className="mt-auto text-xs font-bold text-primary sm:text-sm">
                      {formatIDR(p.price)}
                    </p>
                    <p className="text-[10px] text-muted-foreground sm:text-[11px]">
                      Stok: {p.stock}
                      {!habis && p.stock <= 5 && (
                        <span className="ml-1 font-semibold text-amber-500">menipis</span>
                      )}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart sidebar desktop */}
      <aside className="hidden w-96 shrink-0 lg:block">
        <div className="sticky top-[72px]">
          <CartPanel onCheckout={() => setCheckoutOpen(true)} />
        </div>
      </aside>

      {/* FAB cart mobile */}
      {count > 0 && (
        <Button
          onClick={() => setMobileCartOpen(true)}
          size="lg"
          className="fixed bottom-16 right-4 z-40 h-12 rounded-full px-4 shadow-lg lg:hidden"
        >
          <ShoppingCart className="size-5" />
          <span className="font-semibold">{formatIDR(total)}</span>
          <Badge className="ml-1 rounded-full bg-primary-foreground px-1.5 text-primary">
            {totalQty}
          </Badge>
        </Button>
      )}

      {/* Cart sheet mobile */}
      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetContent side="right" className="flex w-full max-w-sm flex-col gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle>Pesanan</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 p-4">
            <CartPanel onCheckout={() => setCheckoutOpen(true)} />
          </div>
        </SheetContent>
      </Sheet>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onSuccess={handleSuccess}
      />
      <NotaDialog open={notaOpen} onOpenChange={setNotaOpen} transaction={lastTrx} />
    </div>
  )
}
