<script setup lang="ts">
import { useProducts } from "@/composables/use-products"
import ProductCard from "@/views/catalog/components/ProductCard.vue"

const { data: products, isPending } = useProducts()
</script>

<template>
  <p v-if="isPending">Loading the catalogue</p>
  <ul v-else>
    <li v-for="product in products" :key="product.id">
      <ProductCard :product="product" />
    </li>
  </ul>
</template>
