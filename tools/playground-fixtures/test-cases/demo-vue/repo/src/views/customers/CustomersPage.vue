<script setup lang="ts">
import { useCustomers } from "@/composables/use-customers"
import CustomerRow from "@/views/customers/components/CustomerRow.vue"

const { data: customers, isPending, isError } = useCustomers()
</script>

<template>
  <p v-if="isPending">Loading the customers…</p>
  <p v-else-if="isError">The customers could not be loaded.</p>
  <table v-else>
    <tbody>
      <CustomerRow v-for="customer in customers" :key="customer.id" :customer="customer" />
    </tbody>
  </table>
</template>
