import { useEffect, useRef, useState } from "react"

interface SteppedWaypoint {
  readonly id: string
  readonly anchorId: string
  readonly positionLabel: string
  readonly previousId: string | null
  readonly nextId: string | null
}

type SteppedRow = { readonly kind: "waypoint", readonly waypoint: SteppedWaypoint } | { readonly kind: "lines" | "gap" }

interface SteppedSegment {
  readonly walkthrough: { readonly files: readonly { readonly rows: readonly SteppedRow[] }[] }
}

interface SteppingEnds {
  readonly firstWaypointId: string | null
  readonly lastWaypointId: string | null
}

interface Visit {
  readonly anchorId: string
  readonly count: number
}

export interface WaypointStepping {
  readonly openWaypointIds: ReadonlySet<string>
  readonly currentWaypointId: string | null
  readonly focusedWaypointId: string | null
  readonly positionLabel: string | null
  readonly canStepBack: boolean
  readonly canStepForward: boolean
  readonly onPrevious: () => void
  readonly onNext: () => void
  readonly onToggleWaypoint: (waypointId: string) => void
  readonly onOpenCodeLink: (anchorId: string) => void
}

const FOCUS_RELEASE_SCROLL_PX = 160
const FOCUS_KEPT_VISIBLE_SHARE = 0.33
const BAND_HEIGHT_PX = 56
const SCROLL_SETTLE_MS = 900
const READING_LINE_PX = 120

export const scrollToAnchor = (anchorId: string): void => {
  document.getElementById(anchorId)?.scrollIntoView({ block: "start" })
}

const visibleShareOf = (waypointId: string): number => {
  const rects = [...document.querySelectorAll(`[data-waypoint-focus="${CSS.escape(waypointId)}"]`)].map((element) => element.getBoundingClientRect())
  if (rects.length === 0) return 0
  const top = Math.min(...rects.map((rect) => rect.top))
  const bottom = Math.max(...rects.map((rect) => rect.bottom))
  const visible = Math.max(0, Math.min(bottom, window.innerHeight) - Math.max(top, BAND_HEIGHT_PX))
  return visible / Math.max(1, bottom - top)
}

const isBelowReadingLine = (waypoint: SteppedWaypoint): boolean | null => {
  const element = document.getElementById(waypoint.anchorId)
  return element === null ? null : element.getBoundingClientRect().top >= READING_LINE_PX
}

const firstBelowReadingLine = (waypoints: readonly SteppedWaypoint[]): SteppedWaypoint | null =>
  waypoints.find((waypoint) => isBelowReadingLine(waypoint) === true) ?? null

const lastAboveReadingLine = (waypoints: readonly SteppedWaypoint[]): SteppedWaypoint | null =>
  waypoints.filter((waypoint) => isBelowReadingLine(waypoint) === false).at(-1) ?? null

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

export const useWaypointStepping = (segments: readonly SteppedSegment[], ends: SteppingEnds | null): WaypointStepping => {
  const [openWaypointIds, setOpenWaypointIds] = useState<ReadonlySet<string>>(() => new Set())
  const [currentWaypointId, setCurrentWaypointId] = useState<string | null>(null)
  const [focusedWaypointId, setFocusedWaypointId] = useState<string | null>(null)
  const [visit, setVisit] = useState<Visit | null>(null)
  const [onRelease] = useState(() => releaseFocus(setFocusedWaypointId))
  const waypoints = segments.flatMap((segment) =>
    segment.walkthrough.files.flatMap((file) =>
      file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : []))))
  const currentWaypoint = waypoints.find((waypoint) => waypoint.id === currentWaypointId) ?? null
  const previousWaypointId = currentWaypoint === null ? ends?.lastWaypointId ?? null : currentWaypoint.previousId
  const nextWaypointId = currentWaypoint === null ? ends?.firstWaypointId ?? null : currentWaypoint.nextId

  useEffect(() => {
    if (visit !== null) scrollToAnchor(visit.anchorId)
  }, [visit])

  useFocusRelease(focusedWaypointId, visit, onRelease)

  const visitWaypoint = (waypointId: string | null): void => {
    const waypoint = waypoints.find((candidate) => candidate.id === waypointId)
    if (waypoint === undefined) return
    setCurrentWaypointId(waypoint.id)
    setFocusedWaypointId(waypoint.id)
    setOpenWaypointIds((openIds) => new Set([...openIds, waypoint.id]))
    setVisit((previous) => ({ anchorId: waypoint.anchorId, count: (previous?.count ?? 0) + 1 }))
  }

  return {
    openWaypointIds,
    currentWaypointId,
    focusedWaypointId,
    positionLabel: currentWaypoint?.positionLabel ?? null,
    canStepBack: previousWaypointId !== null,
    canStepForward: nextWaypointId !== null,
    onPrevious: () => {
      visitWaypoint(currentWaypoint === null ? lastAboveReadingLine(waypoints)?.id ?? previousWaypointId : previousWaypointId)
    },
    onNext: () => {
      visitWaypoint(currentWaypoint === null ? firstBelowReadingLine(waypoints)?.id ?? nextWaypointId : nextWaypointId)
    },
    onToggleWaypoint: (waypointId) => {
      setCurrentWaypointId(waypointId)
      setOpenWaypointIds((openIds) =>
        new Set(openIds.has(waypointId) ? [...openIds].filter((openId) => openId !== waypointId) : [...openIds, waypointId]))
    },
    onOpenCodeLink: (anchorId) => {
      const waypoint = waypoints.find((candidate) => candidate.anchorId === anchorId)
      if (waypoint === undefined) scrollToAnchor(anchorId)
      else visitWaypoint(waypoint.id)
    },
  }
}
