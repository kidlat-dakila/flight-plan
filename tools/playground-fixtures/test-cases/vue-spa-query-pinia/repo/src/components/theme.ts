import type { InjectionKey, Ref } from "vue"

export type Theme = "light" | "dark"

export interface ThemeContext {
  theme: Ref<Theme>
  toggleTheme: () => void
}

export const themeKey: InjectionKey<ThemeContext> = Symbol("theme")
