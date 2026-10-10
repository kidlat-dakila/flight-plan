<script setup lang="ts">
import BaseButton from "@/components/ui/BaseButton.vue"

defineProps<{ title: string, isOpen: boolean }>()
const emit = defineEmits<{ (event: "close"): void }>()
</script>

<template>
  <div v-if="isOpen" role="dialog">
    <h2>{{ title }}</h2>
    <slot />
    <BaseButton variant="ghost" @click="emit('close')">Close</BaseButton>
  </div>
</template>
