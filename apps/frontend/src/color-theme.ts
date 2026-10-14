import { useState, useSyncExternalStore } from "react"

export type ColorTheme = "light" | "dark"

const THEME_STORAGE_KEY = "flightplan.color-theme"
const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)"

const isColorTheme = (value: string | null): value is ColorTheme => value === "light" || value === "dark"

const readStoredTheme = (): ColorTheme | null => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isColorTheme(stored) ? stored : null
  } catch {
    return null
  }
}

const tryStoreTheme = (theme: ColorTheme): boolean => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    return true
  } catch {
    return false
  }
}

const applyTheme = (theme: ColorTheme): void => {
  document.documentElement.setAttribute("data-theme", theme)
}

const oppositeTheme = (theme: ColorTheme): ColorTheme => (theme === "dark" ? "light" : "dark")

const subscribeToSystemTheme = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(DARK_SCHEME_QUERY)
  query.addEventListener("change", onChange)
  return () => {
    query.removeEventListener("change", onChange)
  }
}

const readSystemTheme = (): ColorTheme => (window.matchMedia(DARK_SCHEME_QUERY).matches ? "dark" : "light")

export interface ColorThemeChoice {
  readonly theme: ColorTheme
  readonly onToggle: () => void
}

export const useColorTheme = (): ColorThemeChoice => {
  const [storedTheme, setStoredTheme] = useState(readStoredTheme)
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, readSystemTheme)
  const theme = storedTheme ?? systemTheme
  return {
    theme,
    onToggle: () => {
      const toggled = oppositeTheme(theme)
      tryStoreTheme(toggled)
      applyTheme(toggled)
      setStoredTheme(toggled)
    },
  }
}
