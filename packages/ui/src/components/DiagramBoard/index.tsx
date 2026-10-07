import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { useState, type ComponentProps, type ReactNode } from "react"
import IconButton from "@/components/IconButton"
import type { Point } from "@/lib/diagram-path"
import { ESCAPE_KEY_REASON } from "@/lib/dialog-close"
import { useDragPan } from "@/lib/use-drag-pan"
import { cn } from "@/lib/utils"

interface DiagramBoardProps {
  readonly label: string
  readonly width: number
  readonly height: number
  readonly isFullScreen: boolean
  readonly panel: ReactNode
  readonly actions?: ReactNode
  readonly children: ReactNode
  readonly onFullScreenChange: (isFullScreen: boolean) => void
  readonly onPanelClose: () => void
}

type OpenChangeHandler = NonNullable<ComponentProps<typeof DialogPrimitive.Root>["onOpenChange"]>

const ZOOM_STEP = 1.25
const MIN_ZOOM_STEPS = -3
const MAX_ZOOM_STEPS = 2
const BORDER_ALLOWANCE_PX = 2
const MIN_INLINE_HEIGHT_PX = 160

interface CanvasProps {
  readonly label: string
  readonly width: number
  readonly height: number
  readonly zoom: number
  readonly offset: Point
  readonly isDragging: boolean
  readonly children: ReactNode
  readonly onDragStart: ComponentProps<"div">["onPointerDown"]
  readonly onClickCapture: ComponentProps<"div">["onClickCapture"]
}

const Canvas = ({ label, width, height, zoom, offset, isDragging, children, onDragStart, onClickCapture }: CanvasProps) => (
  <div
    role="group"
    aria-label={label}
    data-dragging={isDragging}
    className="size-full cursor-grab touch-none overflow-clip bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-size-[16px_16px] select-none data-[dragging=true]:cursor-grabbing"
    style={{ backgroundPosition: `${String(offset.x)}px ${String(offset.y)}px` }}
    onPointerDown={onDragStart}
    onClickCapture={onClickCapture}
  >
    <div
      className="mx-auto"
      style={{ width: width * zoom, height: height * zoom, transform: `translate(${String(offset.x)}px, ${String(offset.y)}px)` }}
    >
      <div className="relative origin-top-left" style={{ width, height, transform: `scale(${String(zoom)})` }}>
        {children}
      </div>
    </div>
  </div>
)

const DiagramBoard = ({ label, width, height, isFullScreen, panel, actions = null, children, onFullScreenChange, onPanelClose }: DiagramBoardProps) => {
  const [zoomSteps, setZoomSteps] = useState(0)
  const { offset, isDragging, startDrag, swallowClickAfterDrag, resetPan } = useDragPan()
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
  const canvas = (
    <Canvas
      label={label}
      width={width}
      height={height}
      zoom={zoom}
      offset={offset}
      isDragging={isDragging}
      onDragStart={startDrag}
      onClickCapture={swallowClickAfterDrag}
    >
      {children}
    </Canvas>
  )
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
            <aside
              className={cn(
                "w-[min(38rem,48vw)] shrink-0 overflow-y-auto border-l bg-background duration-200 ease-out animate-in slide-in-from-right-8",
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
