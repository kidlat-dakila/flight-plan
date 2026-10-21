import type { InjectionKey, Ref } from "vue"

export interface SessionContext {
  professorName: Ref<string>
  signOut: () => void
}

export const sessionKey: InjectionKey<SessionContext> = Symbol("session")
