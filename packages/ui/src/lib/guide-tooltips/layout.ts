import { useEffect, useEffectEvent, useRef } from "react"

export interface ScreenBox {
  readonly top: number
  readonly bottom: number
  readonly left: number
  readonly right: number
}

export type ViewPlacement = "dominant" | "inside-dominant" | "free" | "elsewhere"

export interface ViewCandidate {
  readonly viewId: string
  readonly placement: ViewPlacement
  readonly isOnScreen: boolean
}

const NO_FRAME = 0

const overlapOf = (start: number, end: number, viewportStart: number, viewportEnd: number): number =>
  Math.max(0, Math.min(end, viewportEnd) - Math.max(start, viewportStart))

const visibleShareOf = (box: ScreenBox, viewport: ScreenBox): number => {
  const area = (box.bottom - box.top) * (box.right - box.left)
  if (area <= 0) return 0
  const visibleArea = overlapOf(box.top, box.bottom, viewport.top, viewport.bottom) * overlapOf(box.left, box.right, viewport.left, viewport.right)
  return visibleArea / area
}

export const isOnScreen = (box: ScreenBox, viewport: ScreenBox): boolean => visibleShareOf(box, viewport) > 0

export const mostPresentIndexOf = (boxes: readonly ScreenBox[], viewport: ScreenBox): number | null =>
  boxes.reduce<{ readonly index: number | null, readonly share: number }>((best, box, index) => {
    const share = visibleShareOf(box, viewport)
    return share > best.share ? { index, share } : best
  }, { index: null, share: 0 }).index

const isCounted = (candidate: ViewCandidate): boolean =>
  candidate.placement === "dominant" || (candidate.isOnScreen && (candidate.placement === "inside-dominant" || candidate.placement === "free"))

export const visibleViewIdsOf = (candidates: readonly ViewCandidate[]): readonly string[] =>
  [...new Set(candidates.filter(isCounted).map((candidate) => candidate.viewId))]

export const windowBox = (): ScreenBox => ({ top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth })

export const screenBoxOf = (element: Element): ScreenBox => {
  const { top, bottom, left, right } = element.getBoundingClientRect()
  return { top, bottom, left, right }
}

export const useLayoutChanges = (isActive: boolean, onChange: () => void, measureKey = ""): void => {
  const handleChange = useEffectEvent(onChange)
  const frameRef = useRef(NO_FRAME)

  useEffect(() => {
    if (!isActive) return undefined
    const measure = (): void => {
      frameRef.current = NO_FRAME
      handleChange()
    }
    const scheduleMeasure = (): void => {
      if (frameRef.current === NO_FRAME) frameRef.current = requestAnimationFrame(measure)
    }
    const mutationObserver = new MutationObserver(scheduleMeasure)
    mutationObserver.observe(document.body, { childList: true, subtree: true })
    window.addEventListener("scroll", scheduleMeasure, { passive: true, capture: true })
    window.addEventListener("resize", scheduleMeasure)
    scheduleMeasure()
    return () => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = NO_FRAME
      mutationObserver.disconnect()
      window.removeEventListener("scroll", scheduleMeasure, { capture: true })
      window.removeEventListener("resize", scheduleMeasure)
    }
  }, [isActive, measureKey])
}
