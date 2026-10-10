<script setup lang="ts">
import { useCartStore } from "@/stores/cart-store"
import CartLine from "@/views/cart/components/CartLine.vue"
import CartSummary from "@/views/cart/components/CartSummary.vue"

const cart = useCartStore()
</script>

<template>
  <section>
    <h1>Your cart</h1>
    <ul>
      <CartLine v-for="item in cart.items" :key="item.product.id" :item="item" @remove="cart.removeItem(item.product.id)" />
    </ul>
    <CartSummary />
  </section>
</template>
