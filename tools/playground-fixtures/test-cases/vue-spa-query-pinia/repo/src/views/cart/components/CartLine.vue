<script setup lang="ts">
import { BaseButton } from "@/components/ui"
import { formatPrice } from "@/lib/format"
import type { CartItem } from "@/types/product"

defineProps<{ item: CartItem }>()
const emit = defineEmits<{ (event: "remove"): void }>()

const handleRemove = () => {
  emit("remove")
}
</script>

<template>
  <li>
    <span>{{ item.product.name }}</span>
    <span>{{ formatPrice(item.product.priceCents) }}</span>
    <BaseButton variant="ghost" @click="handleRemove">Remove</BaseButton>
  </li>
</template>
