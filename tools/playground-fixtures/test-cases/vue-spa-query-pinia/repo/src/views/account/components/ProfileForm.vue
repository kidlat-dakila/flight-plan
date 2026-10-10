<script setup lang="ts">
import { reactive, ref } from "vue"
import { BaseButton, BaseInput } from "@/components/ui"
import { useUpdateProfile } from "@/composables/use-profile"
import { profileSchema, type Profile } from "@/views/account/components/profile-schema"

const props = defineProps<{ profile: Profile }>()
const form = reactive({ ...props.profile })
const error = ref("")
const { mutate } = useUpdateProfile()

const handleSubmit = () => {
  const parsed = profileSchema.safeParse(form)
  if (!parsed.success) {
    error.value = "Check your name and your email"
    return
  }
  mutate(parsed.data)
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <BaseInput v-model="form.name" label="Name" />
    <BaseInput v-model="form.email" label="Email" />
    <p v-if="error">{{ error }}</p>
    <BaseButton>Save</BaseButton>
  </form>
</template>
