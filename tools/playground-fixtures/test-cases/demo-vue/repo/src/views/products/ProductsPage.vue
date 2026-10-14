<script setup lang="ts">
import { useProducts } from "@/composables/use-products"
import { formatPrice } from "@/lib/format"

const { data: products, isPending, isError } = useProducts()
</script>

<template>
  <p v-if="isPending">Loading the products…</p>
  <p v-else-if="isError">The products could not be loaded.</p>
  <ul v-else>
    <li v-for="product in products" :key="product.id">{{ product.name }} {{ formatPrice(product.priceCents) }}</li>
  </ul>
</template>
