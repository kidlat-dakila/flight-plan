import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { useRef, useState, type ComponentProps, type ReactNode } from "react"
import IconButton from "@/components/IconButton"
import type { Point } from "@/lib/diagram-path"
import { ESCAPE_KEY_REASON } from "@/lib/dialog-close"
import { useDragPan } from "@/lib/use-drag-pan"
import { usePanelResize, widestPanelPx } from "@/lib/use-panel-resize"
import { cn } from "@/lib/utils"

export interface BoardView {
  readonly zoom: number
  readonly offset: Point
  readonly onPan: (offset: Point) => void
}

interface DiagramBoardProps {
  readonly label: string
  readonly width: number
  readonly height: number
  readonly isFullScreen: boolean
  readonly isCentred?: boolean
  readonly panel: ReactNode
  readonly actions?: ReactNode
  readonly renderCanvas?: ((view: BoardView) => ReactNode) | null
  readonly children?: ReactNode
  readonly onFullScreenChange: (isFullScreen: boolean) => void
  readonly onPanelClose: () => void
}

type OpenChangeHandler = NonNullable<ComponentProps<typeof DialogPrimitive.Root>["onOpenChange"]>

const ZOOM_STEP = 1.25
const MIN_ZOOM_STEPS = -3
const MAX_ZOOM_STEPS = 2
const BORDER_ALLOWANCE_PX = 2
const MIN_INLINE_HEIGHT_PX = 160
const RESIZE_LABEL = "Side panel width"
const OWN_PANEL_WIDTH_PX = 669
const OWN_WIDTH_TEXT = "Its own width"
const RESIZE_HINT = "Drag to resize, double-click to reset"

interface CanvasProps {
  readonly label: string
  readonly width: number
  readonly height: number
  readonly zoom: number
  readonly offset: Point
  readonly isDragging: boolean
  readonly isCentred: boolean
  readonly children: ReactNode
  readonly onDragStart: ComponentProps<"div">["onPointerDown"]
  readonly onClickCapture: ComponentProps<"div">["onClickCapture"]
}

const Canvas = ({ label, width, height, zoom, offset, isDragging, isCentred, children, onDragStart, onClickCapture }: CanvasProps) => (
  <div
    role="group"
    aria-label={label}
    data-dragging={isDragging}
    className={cn("size-full cursor-grab touch-none overflow-clip bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-size-[16px_16px] select-none data-[dragging=true]:cursor-grabbing", isCentred && "flex items-center justify-center")}
    style={{ backgroundPosition: `${String(offset.x)}px ${String(offset.y)}px` }}
    onPointerDown={onDragStart}
    onClickCapture={onClickCapture}
  >
    <div
      className={isCentred ? "shrink-0" : "mx-auto"}
      style={{ width: width * zoom, height: height * zoom, transform: `translate(${String(offset.x)}px, ${String(offset.y)}px)` }}
    >
      <div className="relative origin-top-left" style={{ width, height, transform: `scale(${String(zoom)})` }}>
        {children}
      </div>
    </div>
  </div>
)

const DiagramBoard = ({ label, width, height, isFullScreen, isCentred = false, panel, actions = null, renderCanvas = null, children = null, onFullScreenChange, onPanelClose }: DiagramBoardProps) => {
  const [zoomSteps, setZoomSteps] = useState(0)
  const { offset, isDragging, startDrag, swallowClickAfterDrag, panTo, resetPan } = useDragPan()
  const panelRef = useRef<HTMLElement>(null)
  const measurePanelWidth = (): number => panelRef.current?.getBoundingClientRect().width ?? 0
  const { widthPx: panelWidthPx, isResizing, narrowestPx, startResize, resizeByKey, resetWidth } = usePanelResize(measurePanelWidth)
  const zoom = ZOOM_STEP ** zoomSteps
  const closeTopLayer: OpenChangeHandler = (isNextOpen, details) => {
    if (!isNextOpen && details.reason === ESCAPE_KEY_REASON && panel !== null) onPanelClose()
    else onFullScreenChange(isNextOpen)
  }
  const toolbar = (
    <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-input bg-card p-0.5">
      {actions === null
        ? null
        : (
            <>
              {actions}
              <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
            </>
          )}
      <IconButton
        icon="zoom-out"
        label="Zoom out"
        isDisabled={zoomSteps === MIN_ZOOM_STEPS}
        onClick={() => { setZoomSteps((steps) => Math.max(MIN_ZOOM_STEPS, steps - 1)) }}
      />
      <IconButton
        icon="zoom-in"
        label="Zoom in"
        isDisabled={zoomSteps === MAX_ZOOM_STEPS}
        onClick={() => { setZoomSteps((steps) => Math.min(MAX_ZOOM_STEPS, steps + 1)) }}
      />
      <IconButton
        icon="reset-view"
        label="Reset view"
        onClick={() => {
          setZoomSteps(0)
          resetPan()
        }}
      />
      <IconButton
        icon={isFullScreen ? "exit-full-screen" : "full-screen"}
        label={isFullScreen ? "Leave full screen" : "Full screen"}
        onClick={() => { onFullScreenChange(!isFullScreen) }}
      />
    </div>
  )
  const canvas = renderCanvas === null
    ? (
        <Canvas
          label={label}
          width={width}
          height={height}
          zoom={zoom}
          offset={offset}
          isDragging={isDragging}
          isCentred={isCentred}
          onDragStart={startDrag}
          onClickCapture={swallowClickAfterDrag}
        >
          {children}
        </Canvas>
      )
    : renderCanvas({ zoom, offset, onPan: panTo })
  return (
    <>
      <div
        className="relative rounded-md border"
        style={{ height: Math.max(MIN_INLINE_HEIGHT_PX, height * zoom + BORDER_ALLOWANCE_PX) }}
      >
        {isFullScreen
          ? null
          : (
              <>
                {toolbar}
                {canvas}
              </>
            )}
      </div>
      <DialogPrimitive.Root open={isFullScreen} onOpenChange={closeTopLayer}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Popup
            aria-label={label}
            className="fixed inset-0 z-50 flex bg-background text-foreground outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          >
            <div className="relative min-w-0 flex-1">
              {toolbar}
              {canvas}
            </div>
            {panel === null
              ? null
              : (
                  <div
                    role="slider"
                    tabIndex={0}
                    aria-orientation="horizontal"
                    aria-label={RESIZE_LABEL}
                    aria-valuemin={narrowestPx}
                    aria-valuemax={widestPanelPx(window.innerWidth)}
                    aria-valuenow={panelWidthPx ?? OWN_PANEL_WIDTH_PX}
                    aria-valuetext={panelWidthPx === null ? OWN_WIDTH_TEXT : `${String(panelWidthPx)} pixels`}
                    title={RESIZE_HINT}
                    data-resizing={isResizing}
                    className="relative z-10 w-px shrink-0 cursor-col-resize touch-none bg-border transition-colors duration-[180ms] ease-out after:absolute after:inset-y-0 after:-right-1 after:-left-1 hover:bg-foreground focus-visible:bg-ring focus-visible:outline-2 focus-visible:outline-ring data-[resizing=true]:bg-foreground"
                    onPointerDown={startResize}
                    onKeyDown={resizeByKey}
                    onDoubleClick={resetWidth}
                  />
                )}
            <aside
              ref={panelRef}
              style={panelWidthPx === null ? undefined : { width: panelWidthPx }}
              className={cn(
                "w-[min(41.8rem,52.8vw)] max-w-[80vw] min-w-80 shrink-0 overflow-y-auto bg-background duration-200 ease-out animate-in slide-in-from-right-8",
                panel === null ? "hidden" : "",
              )}
            >
              {panel}
            </aside>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}

export default DiagramBoard
