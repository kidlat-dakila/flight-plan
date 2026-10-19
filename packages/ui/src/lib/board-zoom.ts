import type { Point } from "@/lib/diagram-path"

export interface BoardFrame {
  readonly paneWidth: number
  readonly paneHeight: number
  readonly width: number
  readonly height: number
  readonly isCentred: boolean
}

export interface WheelTurn {
  readonly deltaY: number
  readonly deltaMode: number
}

export const ZOOM_STEP = 1.25
export const DEFAULT_ZOOM = 1
const STEPS_OUT = 4
const STEPS_IN = 3
export const MIN_ZOOM = ZOOM_STEP ** -STEPS_OUT
export const MAX_ZOOM = ZOOM_STEP ** STEPS_IN
const WHEEL_ZOOM_RATE = 0.002
const LINE_HEIGHT_PX = 16
const DELTA_LINE_MODE = 1
const DELTA_PAGE_MODE = 2
const HALF = 2

export const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

export const zoomedIn = (zoom: number): number => clampZoom(zoom * ZOOM_STEP)

export const zoomedOut = (zoom: number): number => clampZoom(zoom / ZOOM_STEP)

export const wheelTravelPx = ({ deltaY, deltaMode }: WheelTurn, pageHeightPx: number): number => {
  if (deltaMode === DELTA_LINE_MODE) return deltaY * LINE_HEIGHT_PX
  return deltaMode === DELTA_PAGE_MODE ? deltaY * pageHeightPx : deltaY
}

export const zoomAfterWheel = (zoom: number, travelPx: number): number => clampZoom(zoom * Math.exp(-travelPx * WHEEL_ZOOM_RATE))

const centringOf = ({ paneWidth, paneHeight, width, height, isCentred }: BoardFrame, zoom: number): Point => {
  const spareX = (paneWidth - width * zoom) / HALF
  const spareY = (paneHeight - height * zoom) / HALF
  return isCentred ? { x: spareX, y: spareY } : { x: Math.max(0, spareX), y: 0 }
}

export const offsetZoomedAt = (pointer: Point, offset: Point, zoom: number, nextZoom: number, frame: BoardFrame): Point => {
  const centring = centringOf(frame, zoom)
  const nextCentring = centringOf(frame, nextZoom)
  const ratio = nextZoom / zoom
  const keptAt = (pointerAt: number, originAt: number, nextCentringAt: number): number => pointerAt - (pointerAt - originAt) * ratio - nextCentringAt
  return {
    x: keptAt(pointer.x, centring.x + offset.x, nextCentring.x),
    y: keptAt(pointer.y, centring.y + offset.y, nextCentring.y),
  }
}
