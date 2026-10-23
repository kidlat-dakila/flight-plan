import { useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { saveLayoutPreferences, useLayoutPreferences, type PanelWidthKey } from "@/lib/layout-preferences"

export interface PanelResizing {
  readonly widthKey: PanelWidthKey
  readonly grows: "leftwards" | "rightwards"
  readonly narrowestPx: number
  readonly widestShare: number
}

const PRIMARY_BUTTON = 0
const KEY_STEP_PX = 32
const RELEASE_EVENTS = ["pointerup", "pointercancel"] as const

export const DIAGRAM_PANEL_RESIZING: PanelResizing = {
  widthKey: "diagramPanelWidthPx",
  grows: "leftwards",
  narrowestPx: 320,
  widestShare: 0.8,
}

const LEFTWARDS_STEPS: Readonly<Record<string, number>> = {
  ArrowLeft: KEY_STEP_PX,
  ArrowRight: -KEY_STEP_PX,
}

const RIGHTWARDS_STEPS: Readonly<Record<string, number>> = {
  ArrowLeft: -KEY_STEP_PX,
  ArrowRight: KEY_STEP_PX,
}

export const widestPanelPx = (viewportWidthPx: number, resizing: PanelResizing = DIAGRAM_PANEL_RESIZING): number =>
  Math.max(resizing.narrowestPx, Math.round(viewportWidthPx * resizing.widestShare))

export const fittedPanelWidth = (widthPx: number, viewportWidthPx: number, resizing: PanelResizing = DIAGRAM_PANEL_RESIZING): number =>
  Math.round(Math.min(widestPanelPx(viewportWidthPx, resizing), Math.max(resizing.narrowestPx, widthPx)))

export const draggedWidthOf = (widthAtGrab: number, grabX: number, pointerX: number, grows: PanelResizing["grows"]): number =>
  grows === "leftwards" ? widthAtGrab + grabX - pointerX : widthAtGrab + pointerX - grabX

export const usePanelResize = (measureWidth: () => number, resizing: PanelResizing = DIAGRAM_PANEL_RESIZING) => {
  const savedWidthPx = useLayoutPreferences()[resizing.widthKey]
  const [draggedWidthPx, setDraggedWidthPx] = useState<number | null>(null)
  const isResizing = draggedWidthPx !== null
  const saveWidth = (widthPx: number | null) => {
    saveLayoutPreferences({ [resizing.widthKey]: widthPx })
  }

  const startResize = (event: ReactPointerEvent) => {
    if (event.button !== PRIMARY_BUTTON) return
    event.preventDefault()
    const grabX = event.clientX
    const widthAtGrab = measureWidth()
    const widthAt = (pointerX: number): number =>
      fittedPanelWidth(draggedWidthOf(widthAtGrab, grabX, pointerX, resizing.grows), window.innerWidth, resizing)
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
    const steps = resizing.grows === "leftwards" ? LEFTWARDS_STEPS : RIGHTWARDS_STEPS
    if (!Object.hasOwn(steps, event.key)) return
    event.preventDefault()
    saveWidth(fittedPanelWidth(measureWidth() + steps[event.key], window.innerWidth, resizing))
  }

  const resetWidth = () => {
    saveWidth(null)
  }

  return { widthPx: draggedWidthPx ?? savedWidthPx, isResizing, narrowestPx: resizing.narrowestPx, startResize, resizeByKey, resetWidth }
}
