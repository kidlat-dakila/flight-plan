import { useSyncExternalStore } from "react"

export type ColorTheme = "light" | "dark"

const THEME_STORAGE_KEY = "flightplan.color-theme"
const THEME_ATTRIBUTE = "data-theme"
const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)"

const isColorTheme = (value: string | null): value is ColorTheme => value === "light" || value === "dark"

const tryStoreTheme = (theme: ColorTheme): boolean => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    return true
  } catch {
    return false
  }
}

const applyTheme = (theme: ColorTheme): void => {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme)
}

const oppositeTheme = (theme: ColorTheme): ColorTheme => (theme === "dark" ? "light" : "dark")

const subscribeToChosenTheme = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributeFilter: [THEME_ATTRIBUTE] })
  return () => {
    observer.disconnect()
  }
}

const readChosenTheme = (): ColorTheme | null => {
  const applied = document.documentElement.getAttribute(THEME_ATTRIBUTE)
  return isColorTheme(applied) ? applied : null
}

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
  const chosenTheme = useSyncExternalStore(subscribeToChosenTheme, readChosenTheme)
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, readSystemTheme)
  const theme = chosenTheme ?? systemTheme
  return {
    theme,
    onToggle: () => {
      const toggled = oppositeTheme(theme)
      tryStoreTheme(toggled)
      applyTheme(toggled)
    },
  }
}
