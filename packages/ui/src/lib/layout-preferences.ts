import { useMemo, useSyncExternalStore } from "react"

export interface LayoutPreferences {
  readonly diagramPanelWidthPx: number | null
  readonly explorerWidthPx: number | null
  readonly sectionsWidthPx: number | null
  readonly chatWidthPx: number | null
}

export type PanelWidthKey = keyof LayoutPreferences

const STORAGE_KEY = "flight-plan:layout:v1"
const SAVED_EVENT = "flight-plan:layout-saved"
const CHANGE_EVENTS = [SAVED_EVENT, "storage"] as const
const DEFAULT_PREFERENCES: LayoutPreferences = { diagramPanelWidthPx: null, explorerWidthPx: null, sectionsWidthPx: null, chatWidthPx: null }

const widthIn = (stored: object, key: PanelWidthKey): number | null => {
  const width: unknown = Reflect.get(stored, key)
  return typeof width === "number" && Number.isFinite(width) ? width : null
}

const toPreferences = (stored: unknown): LayoutPreferences =>
  typeof stored !== "object" || stored === null
    ? DEFAULT_PREFERENCES
    : {
        diagramPanelWidthPx: widthIn(stored, "diagramPanelWidthPx"),
        explorerWidthPx: widthIn(stored, "explorerWidthPx"),
        sectionsWidthPx: widthIn(stored, "sectionsWidthPx"),
        chatWidthPx: widthIn(stored, "chatWidthPx"),
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

export const saveLayoutPreferences = (change: Partial<LayoutPreferences>): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsePreferences(readStoredText()), ...change }))
  } catch {
    return
  }
  window.dispatchEvent(new Event(SAVED_EVENT))
}

export const useLayoutPreferences = (): LayoutPreferences => {
  const storedText = useSyncExternalStore(subscribe, readStoredText, readNothing)
  return useMemo(() => parsePreferences(storedText), [storedText])
}
