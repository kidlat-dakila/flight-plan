import type { KeyboardEvent, PointerEvent } from "react"
import { cn } from "@/lib/utils"

interface PanelResizeHandleProps {
  readonly label: string
  readonly widthPx: number | null
  readonly ownWidthPx: number
  readonly narrowestPx: number
  readonly widestPx: number
  readonly isResizing: boolean
  readonly className?: string
  readonly onPointerDown: (event: PointerEvent) => void
  readonly onKeyDown: (event: KeyboardEvent) => void
  readonly onDoubleClick: () => void
}

const OWN_WIDTH_TEXT = "Its own width"
const RESIZE_HINT = "Drag to resize, double-click to reset"

const PanelResizeHandle = ({ label, widthPx, ownWidthPx, narrowestPx, widestPx, isResizing, className, onPointerDown, onKeyDown, onDoubleClick }: PanelResizeHandleProps) => (
  <div
    role="slider"
    tabIndex={0}
    aria-orientation="horizontal"
    aria-label={label}
    aria-valuemin={narrowestPx}
    aria-valuemax={widestPx}
    aria-valuenow={widthPx ?? ownWidthPx}
    aria-valuetext={widthPx === null ? OWN_WIDTH_TEXT : `${String(widthPx)} pixels`}
    title={RESIZE_HINT}
    data-resizing={isResizing}
    className={cn(
      "z-10 w-px shrink-0 cursor-col-resize touch-none bg-border transition-colors duration-[180ms] ease-out after:absolute after:inset-y-0 after:-right-1 after:-left-1 hover:bg-foreground focus-visible:bg-ring focus-visible:outline-2 focus-visible:outline-ring data-[resizing=true]:bg-foreground",
      className,
    )}
    onPointerDown={onPointerDown}
    onKeyDown={onKeyDown}
    onDoubleClick={onDoubleClick}
  />
)

export default PanelResizeHandle
