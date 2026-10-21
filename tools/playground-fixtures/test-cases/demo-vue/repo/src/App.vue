<script setup lang="ts">
import { provide, ref } from "vue"
import { RouterView } from "vue-router"
import { sessionKey } from "@/components/session"

const GUEST_NAME = "Guest"

const professorName = ref("Professor Oak")
const signOut = () => {
  professorName.value = GUEST_NAME
}

provide(sessionKey, { professorName, signOut })
</script>

<template>
  <RouterView />
</template>
