import { clampZoom, MAX_ZOOM, MIN_ZOOM, offsetZoomedAt, wheelTravelPx, zoomAfterWheel, zoomedIn, zoomedOut, type BoardFrame } from "@/lib/board-zoom"

const FRAME: BoardFrame = { paneWidth: 1000, paneHeight: 600, width: 400, height: 300, isCentred: false }

const boardPointUnder = (pointer: { x: number, y: number }, offset: { x: number, y: number }, zoom: number, frame: BoardFrame) => {
  const centringX = frame.isCentred ? (frame.paneWidth - frame.width * zoom) / 2 : Math.max(0, (frame.paneWidth - frame.width * zoom) / 2)
  const centringY = frame.isCentred ? (frame.paneHeight - frame.height * zoom) / 2 : 0
  return { x: (pointer.x - centringX - offset.x) / zoom, y: (pointer.y - centringY - offset.y) / zoom }
}

describe("board zoom", () => {
  it("zooms in on a scroll up and out on a scroll down, within its bounds", () => {
    expect(zoomAfterWheel(1, -100)).toBeGreaterThan(1)
    expect(zoomAfterWheel(1, 100)).toBeLessThan(1)
    expect(zoomAfterWheel(MAX_ZOOM, -1000)).toBe(MAX_ZOOM)
    expect(zoomAfterWheel(MIN_ZOOM, 1000)).toBe(MIN_ZOOM)
  })

  it("steps the zoom of the buttons by a quarter, within the same bounds", () => {
    expect(zoomedIn(1)).toBe(1.25)
    expect(zoomedOut(1.25)).toBe(1)
    expect(zoomedIn(MAX_ZOOM)).toBe(MAX_ZOOM)
    expect(zoomedOut(MIN_ZOOM)).toBe(MIN_ZOOM)
    expect(clampZoom(0)).toBe(MIN_ZOOM)
  })

  it("reads a scroll by lines or by pages as pixels", () => {
    expect(wheelTravelPx({ deltaY: 3, deltaMode: 0 }, 600)).toBe(3)
    expect(wheelTravelPx({ deltaY: 3, deltaMode: 1 }, 600)).toBe(48)
    expect(wheelTravelPx({ deltaY: 1, deltaMode: 2 }, 600)).toBe(600)
  })

  it("keeps the point of the board under the pointer where it is, on a board centred across and on one centred both ways", () => {
    const pointer = { x: 640, y: 210 }
    const offset = { x: -30, y: 15 }
    const centredBothWays: BoardFrame = { ...FRAME, isCentred: true }
    ;[FRAME, centredBothWays].forEach((frame) => {
      const nextOffset = offsetZoomedAt(pointer, offset, 1, 1.5, frame)
      const before = boardPointUnder(pointer, offset, 1, frame)
      const after = boardPointUnder(pointer, nextOffset, 1.5, frame)

      expect(after.x).toBeCloseTo(before.x)
      expect(after.y).toBeCloseTo(before.y)
    })
  })
})
