<script setup lang="ts">
defineProps<{ label: string, modelValue: string }>()
const emit = defineEmits<{ (event: "update:modelValue", value: string): void }>()
</script>

<template>
  <label>
    {{ label }}
    <input :value="modelValue" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
  </label>
</template>
