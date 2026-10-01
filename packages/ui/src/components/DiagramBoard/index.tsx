import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { useState, type ReactNode } from "react"
import IconButton from "@/components/IconButton"
import { cn } from "@/lib/utils"

interface DiagramBoardProps {
  readonly label: string
  readonly width: number
  readonly height: number
  readonly isFullScreen: boolean
  readonly panel: ReactNode
  readonly children: ReactNode
  readonly onFullScreenChange: (isFullScreen: boolean) => void
}

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
  readonly children: ReactNode
}

const Canvas = ({ label, width, height, zoom, children }: CanvasProps) => (
  <div
    role="group"
    aria-label={label}
    className="size-full overflow-auto bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-size-[16px_16px]"
  >
    <div className="mx-auto" style={{ width: width * zoom, height: height * zoom }}>
      <div className="relative origin-top-left" style={{ width, height, transform: `scale(${String(zoom)})` }}>
        {children}
      </div>
    </div>
  </div>
)

const DiagramBoard = ({ label, width, height, isFullScreen, panel, children, onFullScreenChange }: DiagramBoardProps) => {
  const [zoomSteps, setZoomSteps] = useState(0)
  const zoom = ZOOM_STEP ** zoomSteps
  const toolbar = (
    <div className="absolute top-2 right-2 z-10 flex gap-0.5 rounded-md border border-input bg-card p-0.5">
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
      <IconButton icon="fit" label="Reset zoom" onClick={() => { setZoomSteps(0) }} />
      <IconButton
        icon={isFullScreen ? "exit-full-screen" : "full-screen"}
        label={isFullScreen ? "Leave full screen" : "Full screen"}
        onClick={() => { onFullScreenChange(!isFullScreen) }}
      />
    </div>
  )
  const canvas = <Canvas label={label} width={width} height={height} zoom={zoom}>{children}</Canvas>
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
      <DialogPrimitive.Root open={isFullScreen} onOpenChange={onFullScreenChange}>
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
