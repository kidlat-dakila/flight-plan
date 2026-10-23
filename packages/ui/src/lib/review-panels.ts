import { useEffect, useEffectEvent } from "react"
import { isNavigatorKeyEvent, navigatorKeyOf } from "@/lib/navigator-keys"
import type { PanelResizing } from "@/lib/use-panel-resize"

export type ReviewPanel = "explorer" | "sections" | "chat"

export type SidePanel = Exclude<ReviewPanel, "explorer">

const PANEL_BY_KEY: ReadonlyMap<string, ReviewPanel> = new Map([
  ["ctrl+e", "explorer"],
  ["ctrl+a", "sections"],
  ["ctrl+c", "chat"],
])

export const PANEL_SHORTCUT_LABELS: Readonly<Record<ReviewPanel, string>> = {
  explorer: "Ctrl+E",
  sections: "Ctrl+A",
  chat: "Ctrl+C",
}

export interface DockedPanelResizing extends PanelResizing {
  readonly ownWidthPx: number
}

export const EXPLORER_RESIZING: DockedPanelResizing = { widthKey: "explorerWidthPx", grows: "rightwards", narrowestPx: 224, widestShare: 0.45, ownWidthPx: 296 }

export const SIDE_PANEL_RESIZINGS: Readonly<Record<SidePanel, DockedPanelResizing>> = {
  sections: { widthKey: "sectionsWidthPx", grows: "leftwards", narrowestPx: 192, widestShare: 0.4, ownWidthPx: 224 },
  chat: { widthKey: "chatWidthPx", grows: "leftwards", narrowestPx: 320, widestShare: 0.5, ownWidthPx: 416 },
}

export const panelOfKey = (key: string, hasSelectedText: boolean): ReviewPanel | null => {
  const panel = PANEL_BY_KEY.get(key) ?? null
  return panel === "chat" && hasSelectedText ? null : panel
}

export const nextSidePanel = (shown: SidePanel | null, pressed: SidePanel): SidePanel | null =>
  shown === pressed ? null : pressed

const hasSelectedText = (): boolean => (window.getSelection()?.toString() ?? "") !== ""

export const usePanelShortcuts = (onToggle: (panel: ReviewPanel) => void): void => {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent): void => {
    if (!event.ctrlKey || !isNavigatorKeyEvent(event)) return
    const panel = panelOfKey(navigatorKeyOf(event), hasSelectedText())
    if (panel === null) return
    event.preventDefault()
    onToggle(panel)
  })

  useEffect(() => {
    const listenToKeys = (event: KeyboardEvent): void => {
      handleKeyDown(event)
    }
    window.addEventListener("keydown", listenToKeys)
    return () => {
      window.removeEventListener("keydown", listenToKeys)
    }
  }, [])
}
