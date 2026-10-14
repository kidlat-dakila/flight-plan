<script setup lang="ts">
import type { Customer } from "@/types/customer"

defineProps<{ customer: Customer }>()
</script>

<template>
  <tr>
    <td>{{ customer.name }}</td>
    <td>{{ customer.email }}</td>
  </tr>
</template>
