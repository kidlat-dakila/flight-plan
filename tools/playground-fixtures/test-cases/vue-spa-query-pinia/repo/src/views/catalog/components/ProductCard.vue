<script setup lang="ts">
import { formatPrice } from "@/lib/format"
import type { Product } from "@/types/product"
import AddToCartButton from "@/views/catalog/components/AddToCartButton.vue"

defineProps<{ product: Product }>()
</script>

<template>
  <article>
    <h3>{{ product.name }}</h3>
    <p>{{ formatPrice(product.priceCents) }}</p>
    <AddToCartButton :product="product" />
  </article>
</template>
