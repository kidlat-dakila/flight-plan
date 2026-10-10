import { defineStore } from "pinia"
import { computed, ref } from "vue"
import type { CartItem, Product } from "@/types/product"

export const useCartStore = defineStore("cart", () => {
  const items = ref<CartItem[]>([])

  const itemCount = computed(() => items.value.reduce((count, item) => count + item.quantity, 0))
  const totalCents = computed(() => items.value.reduce((total, item) => total + item.product.priceCents * item.quantity, 0))

  const addItem = (product: Product) => {
    items.value = [...items.value, { product, quantity: 1 }]
  }

  const removeItem = (productId: string) => {
    items.value = items.value.filter((item) => item.product.id !== productId)
  }

  return { items, itemCount, totalCents, addItem, removeItem }
})
