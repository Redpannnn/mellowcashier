"use client"

import { Minus, Plus, ShoppingCart, ShoppingBag, Trash2, ReceiptText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCartStore } from "@/store/cart"
import { formatIDR } from "@/lib/format"
import { ProductImage } from "./product-image"

export function CartPanel({ onCheckout }: { onCheckout: () => void }) {
  const items = useCartStore((s) => s.items)
  const increase = useCartStore((s) => s.increase)
  const decrease = useCartStore((s) => s.decrease)
  const remove = useCartStore((s) => s.remove)
  const clear = useCartStore((s) => s.clear)

  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const totalQty = items.reduce((s, i) => s + i.qty, 0)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="size-4" />
          Pesanan
        </CardTitle>
        <CardDescription>
          {totalQty > 0 ? `${totalQty} item dipilih` : "Belum ada produk dipilih"}
        </CardDescription>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <ShoppingBag className="size-8 opacity-50" />
            <p className="text-sm">Klik produk di samping untuk menambahkan</p>
          </div>
        ) : (
          <div className="scrollbar-thin max-h-[300px] overflow-y-auto px-4 lg:max-h-[380px]">
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-2.5">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border">
                    <ProductImage
                      src={item.image}
                      alt={item.name}
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatIDR(item.price)} x {item.qty} ={" "}
                      <span className="font-medium text-foreground">
                        {formatIDR(item.price * item.qty)}
                      </span>
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6"
                        aria-label={`Kurangi ${item.name}`}
                        onClick={() => decrease(item.id)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6"
                        aria-label={`Tambah ${item.name}`}
                        disabled={item.qty >= item.stock}
                        onClick={() => increase(item.id)}
                      >
                        <Plus className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-destructive"
                        aria-label={`Hapus ${item.name}`}
                        onClick={() => remove(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t p-4">
        <div className="flex w-full items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-bold text-primary">{formatIDR(total)}</span>
        </div>
        <Button className="w-full" size="lg" disabled={items.length === 0} onClick={onCheckout}>
          <ReceiptText className="size-4" />
          Checkout
        </Button>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={clear}
          >
            Kosongkan pesanan
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export function CartTotalBadge() {
  const items = useCartStore((s) => s.items)
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const totalQty = items.reduce((s, i) => s + i.qty, 0)
  return { total, totalQty, count: items.length }
}
