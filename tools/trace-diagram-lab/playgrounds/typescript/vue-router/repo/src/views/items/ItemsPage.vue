<script setup lang="ts">
import { useItems } from "@/composables/use-items"
import { formatPrice } from "@/lib/format"

const { items, isPending } = useItems()
</script>

<template>
  <p v-if="isPending">Loading the items…</p>
  <ul v-else>
    <li v-for="item in items" :key="item.id">{{ item.name }} {{ formatPrice(item.price) }}</li>
  </ul>
</template>
