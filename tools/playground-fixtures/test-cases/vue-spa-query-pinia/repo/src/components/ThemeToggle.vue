<script setup lang="ts">
import { inject } from "vue"
import { BaseButton } from "@/components/ui"
import { themeKey } from "@/components/theme"

const context = inject(themeKey)
</script>

<template>
  <BaseButton @click="context?.toggleTheme()">Switch theme</BaseButton>
</template>
