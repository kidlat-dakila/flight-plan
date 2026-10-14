<script setup lang="ts">
defineProps<{ variant?: "primary" | "ghost", disabled?: boolean }>()
const emit = defineEmits<{ (event: "click"): void }>()
</script>

<template>
  <button :class="['button', variant ?? 'primary']" :disabled="disabled" @click="emit('click')">
    <slot />
  </button>
</template>
