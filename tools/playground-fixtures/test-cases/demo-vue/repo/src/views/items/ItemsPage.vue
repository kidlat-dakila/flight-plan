<script setup lang="ts">
import { useItems } from "@/composables/use-items"
import { formatPrice } from "@/lib/format"

const { data: items, isPending, isError } = useItems()
</script>

<template>
  <p v-if="isPending">Loading the items…</p>
  <p v-else-if="isError">The items could not be loaded.</p>
  <ul v-else>
    <li v-for="item in items" :key="item.id">{{ item.name }} {{ formatPrice(item.price) }}</li>
  </ul>
</template>
