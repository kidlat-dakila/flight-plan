<script setup lang="ts">
import { formatQuantity } from "@/lib/format"
import { useCartStore } from "@/stores/cart-store"

const cart = useCartStore()
</script>

<template>
  <span class="badge">{{ formatQuantity(cart.itemCount) }}</span>
</template>
