import { useEffect, useMemo, useRef, useState } from "react"
import { coveredTopOf } from "@flightplan/ui/lib/pinned-rows"

export interface SteppedWaypoint {
  readonly id: string
  readonly anchorId: string
  readonly positionLabel: string
  readonly previousId: string | null
  readonly nextId: string | null
}

type SteppedRow = { readonly kind: "waypoint", readonly waypoint: SteppedWaypoint } | { readonly kind: "lines" | "gap" }

export interface SteppedSegment {
  readonly walkthrough: { readonly anchorId: string, readonly files: readonly { readonly rows: readonly SteppedRow[] }[] }
}

interface Visit {
  readonly anchorId: string
  readonly waypointId: string
  readonly isOpening: boolean
  readonly count: number
}

export interface PreviewVisit {
  readonly waypointId: string
  readonly count: number
}

interface StepTargets {
  readonly previousId: string | null
  readonly nextId: string | null
}

export interface SegmentStepping {
  readonly positionLabel: string | null
  readonly canStepBack: boolean
  readonly canStepForward: boolean
  readonly onPrevious: () => void
  readonly onNext: () => void
}

export interface WaypointStepping {
  readonly openWaypointIds: ReadonlySet<string>
  readonly previewVisit: PreviewVisit | null
  readonly currentWaypointId: string | null
  readonly focusedWaypointId: string | null
  readonly steppingOf: (segment: SteppedSegment) => SegmentStepping
  readonly onSectionEntered: (anchorId: string) => void
  readonly onVisitWaypoint: (waypointId: string) => void
  readonly onToggleWaypoint: (waypointId: string) => void
  readonly onCurrentOpenChange: (isOpen: boolean) => void
  readonly onOpenCodeLink: (anchorId: string) => void
}

const FOCUS_RELEASE_SCROLL_PX = 160
const FOCUS_KEPT_VISIBLE_SHARE = 0.33
const SCROLL_SETTLE_MS = 900
const READING_LINE_PX = 120
const NO_FRAME = 0
const ANCHOR_SEPARATOR = "\n"

export const scrollToAnchor = (anchorId: string): void => {
  document.getElementById(anchorId)?.scrollIntoView({ block: "start" })
}

const visibleShareOf = (waypointId: string): number => {
  const rects = [...document.querySelectorAll(`[data-waypoint-focus="${CSS.escape(waypointId)}"]`)].map((element) => element.getBoundingClientRect())
  if (rects.length === 0) return 0
  const top = Math.min(...rects.map((rect) => rect.top))
  const bottom = Math.max(...rects.map((rect) => rect.bottom))
  const visible = Math.max(0, Math.min(bottom, window.innerHeight) - Math.max(top, coveredTopOf()))
  return visible / Math.max(1, bottom - top)
}

const isAboveReadingLine = (anchorId: string): boolean => {
  const rect = document.getElementById(anchorId)?.getBoundingClientRect()
  return rect !== undefined && rect.height > 0 && rect.top < READING_LINE_PX
}

const useAnchorIdsAboveReadingLine = (anchorIds: readonly string[]): ReadonlySet<string> => {
  const [aboveKey, setAboveKey] = useState("")
  const frameRef = useRef(NO_FRAME)
  const anchorKey = anchorIds.join(ANCHOR_SEPARATOR)

  useEffect(() => {
    const keyedAnchorIds = anchorKey === "" ? [] : anchorKey.split(ANCHOR_SEPARATOR)
    const measure = (): void => {
      frameRef.current = NO_FRAME
      setAboveKey(keyedAnchorIds.filter(isAboveReadingLine).join(ANCHOR_SEPARATOR))
    }
    const scheduleMeasure = (): void => {
      if (frameRef.current === NO_FRAME) frameRef.current = requestAnimationFrame(measure)
    }
    scheduleMeasure()
    window.addEventListener("scroll", scheduleMeasure, { passive: true })
    window.addEventListener("resize", scheduleMeasure)
    return () => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = NO_FRAME
      window.removeEventListener("scroll", scheduleMeasure)
      window.removeEventListener("resize", scheduleMeasure)
    }
  }, [anchorKey])

  return useMemo(() => new Set(aboveKey === "" ? [] : aboveKey.split(ANCHOR_SEPARATOR)), [aboveKey])
}

const waypointsOf = (segment: SteppedSegment): SteppedWaypoint[] =>
  segment.walkthrough.files.flatMap((file) => file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : [])))

const stepTargetsOf = (waypoints: readonly SteppedWaypoint[], current: SteppedWaypoint | null, aboveAnchorIds: ReadonlySet<string>): StepTargets =>
  current === null
    ? {
        previousId: waypoints.filter((waypoint) => aboveAnchorIds.has(waypoint.anchorId)).at(-1)?.id ?? null,
        nextId: waypoints.find((waypoint) => !aboveAnchorIds.has(waypoint.anchorId))?.id ?? null,
      }
    : { previousId: current.previousId, nextId: current.nextId }

const useFocusRelease = (focusedWaypointId: string | null, visit: Visit | null, onRelease: () => void): void => {
  const settledScrollYRef = useRef<number | null>(null)

  useEffect(() => {
    settledScrollYRef.current = null
    if (focusedWaypointId === null) return undefined
    const settle = (): void => {
      settledScrollYRef.current ??= window.scrollY
    }
    const releaseWhenAway = (): void => {
      const settledScrollY = settledScrollYRef.current
      if (settledScrollY === null) return
      const isScrolledAway = Math.abs(window.scrollY - settledScrollY) > FOCUS_RELEASE_SCROLL_PX
      if (isScrolledAway || visibleShareOf(focusedWaypointId) < FOCUS_KEPT_VISIBLE_SHARE) onRelease()
    }
    const settleTimer = setTimeout(settle, SCROLL_SETTLE_MS)
    window.addEventListener("scrollend", settle)
    window.addEventListener("scroll", releaseWhenAway, { passive: true })
    return () => {
      clearTimeout(settleTimer)
      window.removeEventListener("scrollend", settle)
      window.removeEventListener("scroll", releaseWhenAway)
    }
  }, [focusedWaypointId, visit, onRelease])
}

const releaseFocus = (setFocusedWaypointId: (waypointId: string | null) => void) => (): void => {
  setFocusedWaypointId(null)
}

const previewVisitOf = (visit: Visit | null): PreviewVisit | null =>
  visit === null || visit.isOpening ? null : { waypointId: visit.waypointId, count: visit.count }

export const useWaypointStepping = (segments: readonly SteppedSegment[]): WaypointStepping => {
  const [openWaypointIds, setOpenWaypointIds] = useState<ReadonlySet<string>>(() => new Set())
  const [currentWaypointId, setCurrentWaypointId] = useState<string | null>(null)
  const [focusedWaypointId, setFocusedWaypointId] = useState<string | null>(null)
  const [visit, setVisit] = useState<Visit | null>(null)
  const [onRelease] = useState(() => releaseFocus(setFocusedWaypointId))
  const waypoints = segments.flatMap(waypointsOf)
  const aboveAnchorIds = useAnchorIdsAboveReadingLine(waypoints.map((waypoint) => waypoint.anchorId))

  useEffect(() => {
    if (visit !== null) scrollToAnchor(visit.anchorId)
  }, [visit])

  useFocusRelease(focusedWaypointId, visit, onRelease)

  const visitWaypoint = (waypointId: string | null, isOpening: boolean): void => {
    const waypoint = waypoints.find((candidate) => candidate.id === waypointId)
    if (waypoint === undefined) return
    setCurrentWaypointId(waypoint.id)
    setFocusedWaypointId(waypoint.id)
    if (isOpening) setOpenWaypointIds((openIds) => new Set([...openIds, waypoint.id]))
    setVisit((previous) => ({ anchorId: waypoint.anchorId, waypointId: waypoint.id, isOpening, count: (previous?.count ?? 0) + 1 }))
  }

  return {
    openWaypointIds,
    previewVisit: previewVisitOf(visit),
    currentWaypointId,
    focusedWaypointId,
    steppingOf: (segment) => {
      const segmentWaypoints = waypointsOf(segment)
      const current = segmentWaypoints.find((waypoint) => waypoint.id === currentWaypointId) ?? null
      const targets = stepTargetsOf(segmentWaypoints, current, aboveAnchorIds)
      return {
        positionLabel: current?.positionLabel ?? null,
        canStepBack: targets.previousId !== null,
        canStepForward: targets.nextId !== null,
        onPrevious: () => { visitWaypoint(targets.previousId, false) },
        onNext: () => { visitWaypoint(targets.nextId, false) },
      }
    },
    onSectionEntered: (anchorId) => {
      const entered = segments.find((segment) => segment.walkthrough.anchorId === anchorId)
      const first = entered === undefined ? undefined : waypointsOf(entered).at(0)
      if (first === undefined) return
      setCurrentWaypointId(first.id)
      setFocusedWaypointId(null)
    },
    onVisitWaypoint: (waypointId) => { visitWaypoint(waypointId, false) },
    onToggleWaypoint: (waypointId) => {
      setCurrentWaypointId(waypointId)
      setOpenWaypointIds((openIds) =>
        new Set(openIds.has(waypointId) ? [...openIds].filter((openId) => openId !== waypointId) : [...openIds, waypointId]))
    },
    onCurrentOpenChange: (isOpen) => {
      if (!isOpen) setOpenWaypointIds((openIds) => new Set([...openIds].filter((openId) => openId !== currentWaypointId)))
      visitWaypoint(currentWaypointId, isOpen)
    },
    onOpenCodeLink: (anchorId) => {
      const waypoint = waypoints.find((candidate) => candidate.anchorId === anchorId)
      if (waypoint === undefined) scrollToAnchor(anchorId)
      else visitWaypoint(waypoint.id, true)
    },
  }
}
