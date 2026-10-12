import { useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react"
import type { Point } from "@/lib/diagram-path"

const ORIGIN: Point = { x: 0, y: 0 }
const PRIMARY_BUTTON = 0
const DRAG_THRESHOLD_PX = 4
const RELEASE_EVENTS = ["pointerup", "pointercancel"] as const

const travelBetween = (grab: Point, pointer: Point): Point => ({ x: pointer.x - grab.x, y: pointer.y - grab.y })

const movedBy = (offset: Point, travel: Point): Point => ({ x: offset.x + travel.x, y: offset.y + travel.y })

const isPastThreshold = ({ x, y }: Point): boolean => Math.hypot(x, y) >= DRAG_THRESHOLD_PX

const pointOf = ({ clientX, clientY }: { readonly clientX: number, readonly clientY: number }): Point => ({ x: clientX, y: clientY })

export const useDragPan = () => {
  const [offset, setOffset] = useState<Point>(ORIGIN)
  const [isDragging, setIsDragging] = useState(false)
  const hasJustDragged = useRef(false)

  const startDrag = (event: ReactPointerEvent) => {
    if (event.button !== PRIMARY_BUTTON) return
    hasJustDragged.current = false
    const grab = pointOf(event)
    const offsetAtGrab = offset
    const follow = (move: PointerEvent) => {
      const travel = travelBetween(grab, pointOf(move))
      if (!hasJustDragged.current && !isPastThreshold(travel)) return
      hasJustDragged.current = true
      setIsDragging(true)
      setOffset(movedBy(offsetAtGrab, travel))
    }
    const release = () => {
      window.removeEventListener("pointermove", follow)
      RELEASE_EVENTS.forEach((name) => {
        window.removeEventListener(name, release)
      })
      setIsDragging(false)
    }
    window.addEventListener("pointermove", follow)
    RELEASE_EVENTS.forEach((name) => {
      window.addEventListener(name, release)
    })
  }

  const swallowClickAfterDrag = (event: ReactMouseEvent) => {
    if (!hasJustDragged.current) return
    hasJustDragged.current = false
    event.stopPropagation()
    event.preventDefault()
  }

  const resetPan = () => {
    setOffset(ORIGIN)
  }

  return { offset, isDragging, startDrag, swallowClickAfterDrag, panTo: setOffset, resetPan }
}
