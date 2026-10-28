import { defineStore } from "pinia"
import { ref } from "vue"

const GUEST_NAME = "Guest"

export const useSessionStore = defineStore("session", () => {
  const professorName = ref("Professor Oak")

  const signOut = () => {
    professorName.value = GUEST_NAME
  }

  return { professorName, signOut }
})
