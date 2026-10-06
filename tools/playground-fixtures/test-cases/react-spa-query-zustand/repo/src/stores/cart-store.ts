import { create } from "zustand"
import type { CartItem, Product } from "@/types/product"

interface CartState {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  clear: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (product) => {
    set((state) => ({ items: [...state.items, { product, quantity: 1 }] }))
  },
  removeItem: (productId) => {
    set((state) => ({ items: state.items.filter((item) => item.product.id !== productId) }))
  },
  clear: () => {
    set({ items: [] })
  },
}))

export function selectItemCount(state: CartState): number {
  return state.items.reduce((count, item) => count + item.quantity, 0)
}

export function selectTotalCents(state: CartState): number {
  return state.items.reduce((total, item) => total + item.product.priceCents * item.quantity, 0)
}
