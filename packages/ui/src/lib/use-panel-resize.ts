import { useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { saveLayoutPreferences, useLayoutPreferences } from "@/lib/layout-preferences"

const PRIMARY_BUTTON = 0
const NARROWEST_PANEL_PX = 320
const WIDEST_PANEL_SHARE = 0.8
const KEY_STEP_PX = 32
const RELEASE_EVENTS = ["pointerup", "pointercancel"] as const

const WIDENING_BY_KEY: Readonly<Record<string, number>> = {
  ArrowLeft: KEY_STEP_PX,
  ArrowRight: -KEY_STEP_PX,
}

export const widestPanelPx = (viewportWidthPx: number): number => Math.max(NARROWEST_PANEL_PX, Math.round(viewportWidthPx * WIDEST_PANEL_SHARE))

export const fittedPanelWidth = (widthPx: number, viewportWidthPx: number): number =>
  Math.round(Math.min(widestPanelPx(viewportWidthPx), Math.max(NARROWEST_PANEL_PX, widthPx)))

export const usePanelResize = (measureWidth: () => number) => {
  const { diagramPanelWidthPx: savedWidthPx } = useLayoutPreferences()
  const [draggedWidthPx, setDraggedWidthPx] = useState<number | null>(null)
  const isResizing = draggedWidthPx !== null
  const saveWidth = (widthPx: number | null) => {
    saveLayoutPreferences({ diagramPanelWidthPx: widthPx })
  }

  const startResize = (event: ReactPointerEvent) => {
    if (event.button !== PRIMARY_BUTTON) return
    event.preventDefault()
    const grabX = event.clientX
    const widthAtGrab = measureWidth()
    const widthAt = (pointerX: number): number => fittedPanelWidth(widthAtGrab + grabX - pointerX, window.innerWidth)
    const follow = (move: PointerEvent) => {
      setDraggedWidthPx(widthAt(move.clientX))
    }
    const release = (up: PointerEvent) => {
      window.removeEventListener("pointermove", follow)
      RELEASE_EVENTS.forEach((name) => {
        window.removeEventListener(name, release)
      })
      setDraggedWidthPx(null)
      saveWidth(widthAt(up.clientX))
    }
    setDraggedWidthPx(Math.round(widthAtGrab))
    window.addEventListener("pointermove", follow)
    RELEASE_EVENTS.forEach((name) => {
      window.addEventListener(name, release)
    })
  }

  const resizeByKey = (event: ReactKeyboardEvent) => {
    if (!Object.hasOwn(WIDENING_BY_KEY, event.key)) return
    event.preventDefault()
    saveWidth(fittedPanelWidth(measureWidth() + WIDENING_BY_KEY[event.key], window.innerWidth))
  }

  const resetWidth = () => {
    saveWidth(null)
  }

  return { widthPx: draggedWidthPx ?? savedWidthPx, isResizing, narrowestPx: NARROWEST_PANEL_PX, startResize, resizeByKey, resetWidth }
}
