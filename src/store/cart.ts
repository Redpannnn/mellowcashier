"use client"

import { create } from "zustand"

export type CartProduct = {
  id: string
  name: string
  price: number
  image: string
  stock: number
}

export type CartItem = CartProduct & { qty: number }

type CartState = {
  items: CartItem[]
  add: (p: CartProduct) => boolean
  increase: (id: string) => void
  decrease: (id: string) => void
  remove: (id: string) => void
  clear: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  add: (p) => {
    let added = false
    set((state) => {
      const existing = state.items.find((i) => i.id === p.id)
      if (existing) {
        if (existing.qty >= p.stock) return state
        added = true
        return {
          items: state.items.map((i) =>
            i.id === p.id ? { ...i, qty: i.qty + 1 } : i
          ),
        }
      }
      if (p.stock <= 0) return state
      added = true
      return { items: [...state.items, { ...p, qty: 1 }] }
    })
    return added
  },
  increase: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id && i.qty < i.stock ? { ...i, qty: i.qty + 1 } : i
      ),
    })),
  decrease: (id) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    })),
  remove: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] }),
}))
