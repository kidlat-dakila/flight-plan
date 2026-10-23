import type { ResizableDock } from "@/routes/pr-reviews/$repoName/-hooks/use-panel-widths"
import { widestPanelPx } from "@flightplan/ui/lib/use-panel-resize"
import PanelResizeHandle from "@flightplan/ui/PanelResizeHandle"

interface DockResizeHandleProps {
  readonly dock: ResizableDock
  readonly label: string
  readonly edge: "left" | "right"
}

const EDGE_CLASSES: Readonly<Record<DockResizeHandleProps["edge"], string>> = {
  left: "absolute inset-y-0 -left-px",
  right: "absolute inset-y-0 -right-px",
}

const DockResizeHandle = ({ dock, label, edge }: DockResizeHandleProps) => (
  <PanelResizeHandle
    label={label}
    widthPx={dock.resize.widthPx}
    ownWidthPx={dock.resizing.ownWidthPx}
    narrowestPx={dock.resize.narrowestPx}
    widestPx={widestPanelPx(window.innerWidth, dock.resizing)}
    isResizing={dock.resize.isResizing}
    className={EDGE_CLASSES[edge]}
    onPointerDown={dock.resize.startResize}
    onKeyDown={dock.resize.resizeByKey}
    onDoubleClick={dock.resize.resetWidth}
  />
)

export default DockResizeHandle
