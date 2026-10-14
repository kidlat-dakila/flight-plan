<script setup lang="ts">
import { provide, ref } from "vue"
import { RouterView } from "vue-router"
import { sessionKey } from "@/components/session"

const GUEST_NAME = "Guest"

const staffName = ref("Dana")
const signOut = () => {
  staffName.value = GUEST_NAME
}

provide(sessionKey, { staffName, signOut })
</script>

<template>
  <RouterView />
</template>
