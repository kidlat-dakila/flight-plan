<script setup lang="ts">
defineProps<{ variant?: "primary" | "ghost" }>()
const emit = defineEmits<{ (event: "click"): void }>()
</script>

<template>
  <button :class="['button', variant ?? 'primary']" @click="emit('click')">
    <slot />
  </button>
</template>
