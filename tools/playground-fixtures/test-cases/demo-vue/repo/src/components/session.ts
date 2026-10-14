import type { InjectionKey, Ref } from "vue"

export interface SessionContext {
  staffName: Ref<string>
  signOut: () => void
}

export const sessionKey: InjectionKey<SessionContext> = Symbol("session")
