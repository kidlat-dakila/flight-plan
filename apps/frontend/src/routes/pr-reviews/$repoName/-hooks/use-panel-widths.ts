import type { RefObject } from "react"
import { EXPLORER_RESIZING, SIDE_PANEL_RESIZINGS, type DockedPanelResizing, type SidePanel } from "@flightplan/ui/lib/review-panels"
import { usePanelResize } from "@flightplan/ui/lib/use-panel-resize"

const FOLDED_EXPLORER_WIDTH_PX = 44
const HIDDEN_WIDTH_PX = 0

type PanelResize = ReturnType<typeof usePanelResize>

export interface DockRefs {
  readonly explorer: RefObject<HTMLDivElement | null>
  readonly side: RefObject<HTMLDivElement | null>
}

export interface ResizableDock {
  readonly resize: PanelResize
  readonly resizing: DockedPanelResizing
  readonly widthPx: number
}

export interface PanelWidths {
  readonly explorer: ResizableDock
  readonly side: ResizableDock
  readonly isResizing: boolean
}

const widthOf = (ref: RefObject<HTMLDivElement | null>) => (): number => ref.current?.getBoundingClientRect().width ?? 0

export const dockWidthPx = (isShown: boolean, resize: Pick<PanelResize, "widthPx">, resizing: DockedPanelResizing, hiddenWidthPx: number): number =>
  isShown ? resize.widthPx ?? resizing.ownWidthPx : hiddenWidthPx

export const usePanelWidths = (refs: DockRefs, isExplorerShown: boolean, sidePanel: SidePanel | null): PanelWidths => {
  const explorer = usePanelResize(widthOf(refs.explorer), EXPLORER_RESIZING)
  const sections = usePanelResize(widthOf(refs.side), SIDE_PANEL_RESIZINGS.sections)
  const chat = usePanelResize(widthOf(refs.side), SIDE_PANEL_RESIZINGS.chat)
  const side = sidePanel === "chat" ? chat : sections
  const sideResizing = SIDE_PANEL_RESIZINGS[sidePanel ?? "sections"]
  return {
    explorer: {
      resize: explorer,
      resizing: EXPLORER_RESIZING,
      widthPx: dockWidthPx(isExplorerShown, explorer, EXPLORER_RESIZING, FOLDED_EXPLORER_WIDTH_PX),
    },
    side: {
      resize: side,
      resizing: sideResizing,
      widthPx: dockWidthPx(sidePanel !== null, side, sideResizing, HIDDEN_WIDTH_PX),
    },
    isResizing: explorer.isResizing || side.isResizing,
  }
}
