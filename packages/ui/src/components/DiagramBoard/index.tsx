import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react"
import IconButton from "@/components/IconButton"
import PanelResizeHandle from "@/components/PanelResizeHandle"
import { ReviewNavigatorBar } from "@/components/ReviewNavigator"
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, offsetZoomedAt, wheelTravelPx, zoomAfterWheel, zoomedIn, zoomedOut } from "@/lib/board-zoom"
import type { Point } from "@/lib/diagram-path"
import { ESCAPE_KEY_REASON } from "@/lib/dialog-close"
import { useNavigatorFullScreen, useNavigatorSection } from "@/lib/navigator"
import { navigatorButtonOf, type NavigatorGroup } from "@/lib/navigator-controls"
import { useDragPan } from "@/lib/use-drag-pan"
import { usePanelResize, widestPanelPx } from "@/lib/use-panel-resize"
import { cn } from "@/lib/utils"

export interface BoardNavigation {
  readonly anchorId: string
  readonly groups: readonly NavigatorGroup[]
}

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
  readonly navigation?: BoardNavigation | null
  readonly renderCanvas?: ((view: BoardView) => ReactNode) | null
  readonly children?: ReactNode
  readonly onFullScreenChange: (isFullScreen: boolean) => void
  readonly onPanelClose: () => void
}

type OpenChangeHandler = NonNullable<ComponentProps<typeof DialogPrimitive.Root>["onOpenChange"]>

const BORDER_ALLOWANCE_PX = 2
const MIN_INLINE_HEIGHT_PX = 160
const MAX_INLINE_HEIGHT = "70vh"
const RESIZE_LABEL = "Side panel width"
const OWN_PANEL_WIDTH_PX = 669
const ZOOM_IN_LABEL = "Zoom in"
const ZOOM_OUT_LABEL = "Zoom out"
const FULL_SCREEN_LABEL = "Full screen"
const LEAVE_FULL_SCREEN_LABEL = "Leave full screen"
const FULL_SCREEN_KEY = "f"
const LINE_COLOR_PROPERTY = "--line"

const lineColorOf = (element: HTMLElement | null): string =>
  element === null ? "" : getComputedStyle(element).getPropertyValue(LINE_COLOR_PROPERTY)

const carryLineColorFrom = (board: RefObject<HTMLElement | null>) => (popup: HTMLElement | null): void => {
  const lineColor = lineColorOf(board.current)
  if (popup !== null && lineColor !== "") popup.style.setProperty(LINE_COLOR_PROPERTY, lineColor)
}

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

const TOOLBAR_PLACE_CLASSES = "pointer-events-none z-10 flex justify-end px-2"
const STICKY_TOOLBAR_CLASSES = `${TOOLBAR_PLACE_CLASSES} sticky top-[calc(var(--pinned-height,var(--band-height,0px))+0.5rem)] mt-2`
const FULL_SCREEN_TOOLBAR_CLASSES = `${TOOLBAR_PLACE_CLASSES} absolute inset-x-0 top-2`

const DiagramBoard = ({ label, width, height, isFullScreen, isCentred = false, panel, actions = null, navigation = null, renderCanvas = null, children = null, onFullScreenChange, onPanelClose }: DiagramBoardProps) => {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const { offset, isDragging, startDrag, swallowClickAfterDrag, panTo } = useDragPan()
  const boardRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const popupRef = useRef<HTMLElement | null>(null)
  const holdPopup = (popup: HTMLElement | null): void => {
    popupRef.current = popup
    carryLineColorFrom(boardRef)(popup)
  }
  const measurePanelWidth = (): number => panelRef.current?.getBoundingClientRect().width ?? 0
  const { widthPx: panelWidthPx, isResizing, narrowestPx, startResize, resizeByKey, resetWidth } = usePanelResize(measurePanelWidth)
  const zoomAtWheel = (event: WheelEvent, pane: HTMLElement) => {
    event.preventDefault()
    const paneBox = pane.getBoundingClientRect()
    const nextZoom = zoomAfterWheel(zoom, wheelTravelPx(event, paneBox.height))
    if (nextZoom === zoom) return
    const pointer = { x: event.clientX - paneBox.left, y: event.clientY - paneBox.top }
    panTo(offsetZoomedAt(pointer, offset, zoom, nextZoom, { paneWidth: paneBox.width, paneHeight: paneBox.height, width, height, isCentred }))
    setZoom(nextZoom)
  }
  const listenToWheel = (pane: HTMLDivElement | null) => {
    if (pane === null) return undefined
    const handleWheel = (event: WheelEvent) => {
      zoomAtWheel(event, pane)
    }
    pane.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      pane.removeEventListener("wheel", handleWheel)
    }
  }
  const closeTopLayer: OpenChangeHandler = (isNextOpen, details) => {
    if (!isNextOpen && details.reason === ESCAPE_KEY_REASON && panel !== null) onPanelClose()
    else onFullScreenChange(isNextOpen)
  }
  const fullScreenGroup: NavigatorGroup = [
    navigatorButtonOf({
      key: FULL_SCREEN_KEY,
      actionId: "full-screen-action",
      label: isFullScreen ? LEAVE_FULL_SCREEN_LABEL : FULL_SCREEN_LABEL,
      isPressed: isFullScreen,
      onRun: () => { onFullScreenChange(!isFullScreen) },
    }),
  ]
  useNavigatorSection(navigation?.anchorId ?? null, navigation === null ? [] : [...navigation.groups, fullScreenGroup])
  useNavigatorFullScreen(navigation?.anchorId ?? null, isFullScreen, () => {
    onFullScreenChange(false)
  })
  const toolbar = (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-md border border-input bg-card p-0.5">
      {actions === null
        ? null
        : (
            <>
              {actions}
              <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
            </>
          )}
      <IconButton icon="zoomIn" label={ZOOM_IN_LABEL} isDisabled={zoom >= MAX_ZOOM} onClick={() => { setZoom(zoomedIn) }} />
      <IconButton icon="zoomOut" label={ZOOM_OUT_LABEL} isDisabled={zoom <= MIN_ZOOM} onClick={() => { setZoom(zoomedOut) }} />
      <IconButton
        icon={isFullScreen ? "leaveFullScreen" : "fullScreen"}
        label={isFullScreen ? LEAVE_FULL_SCREEN_LABEL : FULL_SCREEN_LABEL}
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
        ref={boardRef}
        className="relative flex flex-col justify-start rounded-md border"
        style={{ height: Math.max(MIN_INLINE_HEIGHT_PX, height * zoom + BORDER_ALLOWANCE_PX), maxHeight: MAX_INLINE_HEIGHT }}
      >
        {isFullScreen
          ? null
          : (
              <>
                <div ref={listenToWheel} className="absolute inset-0">{canvas}</div>
                <div className={STICKY_TOOLBAR_CLASSES}>{toolbar}</div>
              </>
            )}
      </div>
      <DialogPrimitive.Root open={isFullScreen} onOpenChange={closeTopLayer}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Popup
            ref={holdPopup}
            initialFocus={popupRef}
            aria-label={label}
            data-navigator-scope=""
            className="fixed inset-0 z-50 flex bg-background text-foreground outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          >
            <div ref={listenToWheel} className="relative min-w-0 flex-1">
              <div className={FULL_SCREEN_TOOLBAR_CLASSES}>{toolbar}</div>
              {canvas}
              <ReviewNavigatorBar place="full-screen" />
            </div>
            {panel === null
              ? null
              : (
                  <PanelResizeHandle
                    label={RESIZE_LABEL}
                    widthPx={panelWidthPx}
                    ownWidthPx={OWN_PANEL_WIDTH_PX}
                    narrowestPx={narrowestPx}
                    widestPx={widestPanelPx(window.innerWidth)}
                    isResizing={isResizing}
                    className="relative"
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
