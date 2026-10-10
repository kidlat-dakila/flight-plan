<script setup lang="ts">
import { BaseButton } from "@/components/ui"
import { useCartStore } from "@/stores/cart-store"
import type { Product } from "@/types/product"

const props = defineProps<{ product: Product }>()
const cart = useCartStore()
</script>

<template>
  <BaseButton @click="cart.addItem(props.product)">Add to cart</BaseButton>
</template>
