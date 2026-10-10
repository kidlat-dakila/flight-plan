<script setup lang="ts">
import { useProfile } from "@/composables/use-profile"
import ProfileForm from "@/views/account/components/ProfileForm.vue"

const { data: profile, isPending } = useProfile()
</script>

<template>
  <p v-if="isPending">Loading your profile</p>
  <ProfileForm v-else-if="profile" :profile="profile" />
  <p v-else>Your profile could not be loaded</p>
</template>
