<script setup lang="ts">
import { ref } from "vue"
import { BaseButton, BaseDialog } from "@/components/ui"
import { formatPrice, formatQuantity } from "@/lib/format"
import { useCartStore } from "@/stores/cart-store"

const cart = useCartStore()
const isConfirming = ref(false)

const handleCheckout = () => {
  isConfirming.value = true
}
</script>

<template>
  <aside>
    <p>{{ formatQuantity(cart.itemCount) }}</p>
    <p>{{ formatPrice(cart.totalCents) }}</p>
    <BaseButton @click="handleCheckout">Check out</BaseButton>
    <BaseDialog title="Your order" :is-open="isConfirming" @close="isConfirming = false">
      <p>{{ formatPrice(cart.totalCents) }}</p>
    </BaseDialog>
  </aside>
</template>
