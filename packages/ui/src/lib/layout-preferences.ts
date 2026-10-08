import { useMemo, useSyncExternalStore } from "react"

export interface LayoutPreferences {
  readonly diagramPanelWidthPx: number | null
}

const STORAGE_KEY = "flight-plan:layout:v1"
const SAVED_EVENT = "flight-plan:layout-saved"
const CHANGE_EVENTS = [SAVED_EVENT, "storage"] as const
const DEFAULT_PREFERENCES: LayoutPreferences = { diagramPanelWidthPx: null }

const toPreferences = (stored: unknown): LayoutPreferences => {
  if (typeof stored !== "object" || stored === null || !("diagramPanelWidthPx" in stored)) return DEFAULT_PREFERENCES
  const { diagramPanelWidthPx } = stored
  return typeof diagramPanelWidthPx === "number" && Number.isFinite(diagramPanelWidthPx) ? { diagramPanelWidthPx } : DEFAULT_PREFERENCES
}

const parsePreferences = (text: string | null): LayoutPreferences => {
  try {
    return text === null ? DEFAULT_PREFERENCES : toPreferences(JSON.parse(text))
  } catch {
    return DEFAULT_PREFERENCES
  }
}

const readStoredText = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const readNothing = (): string | null => null

const subscribe = (notify: () => void): (() => void) => {
  CHANGE_EVENTS.forEach((name) => {
    window.addEventListener(name, notify)
  })
  return () => {
    CHANGE_EVENTS.forEach((name) => {
      window.removeEventListener(name, notify)
    })
  }
}

export const saveLayoutPreferences = (preferences: LayoutPreferences): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    return
  }
  window.dispatchEvent(new Event(SAVED_EVENT))
}

export const useLayoutPreferences = (): LayoutPreferences => {
  const storedText = useSyncExternalStore(subscribe, readStoredText, readNothing)
  return useMemo(() => parsePreferences(storedText), [storedText])
}
