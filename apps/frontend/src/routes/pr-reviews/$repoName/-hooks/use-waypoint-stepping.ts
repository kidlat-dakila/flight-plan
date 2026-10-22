import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useStore } from "zustand"
import { coveredTopOf } from "@flightplan/ui/lib/pinned-rows"
import {
  createWalkthroughStore,
  updateWalkthrough,
  withHoldingFile,
  withoutCurrentOpen,
  withoutFocus,
  withPreviewedWaypoint,
  withSectionEntered,
  withToggledWaypoint,
  withVisit,
  type WalkthroughStore,
  type WaypointVisit,
} from "./walkthrough-store"

export interface SteppedWaypoint {
  readonly id: string
  readonly anchorId: string
  readonly positionLabel: string
  readonly previousId: string | null
  readonly nextId: string | null
}

type SteppedRow = { readonly kind: "waypoint", readonly waypoint: SteppedWaypoint } | { readonly kind: "lines" | "gap" }

interface SteppedFile {
  readonly anchorId: string
  readonly rows: readonly SteppedRow[]
}

export interface SteppedSegment {
  readonly walkthrough: { readonly anchorId: string, readonly files: readonly SteppedFile[] }
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
  readonly store: WalkthroughStore
  readonly steppingOf: (segment: SteppedSegment, currentWaypointId: string | null, aboveAnchorIds: ReadonlySet<string>) => SegmentStepping
  readonly onSectionEntered: (anchorId: string) => void
  readonly onVisitWaypoint: (waypointId: string) => void
  readonly onToggleWaypoint: (waypointId: string) => void
  readonly onPreviewWaypoint: (waypointId: string) => void
  readonly onCurrentOpenChange: (isOpen: boolean) => void
  readonly onOpenCodeLink: (anchorId: string) => void
}

const FOCUS_RELEASE_SCROLL_PX = 160
const FOCUS_KEPT_VISIBLE_SHARE = 0.33
const SCROLL_SETTLE_MS = 900
const WAYPOINT_FOCUS_ATTRIBUTE = "data-waypoint-focus"

export const scrollToAnchor = (anchorId: string): void => {
  document.getElementById(anchorId)?.scrollIntoView({ block: "start" })
}

const focusElementsOf = (waypointId: string): Element[] =>
  [...document.querySelectorAll(`[${WAYPOINT_FOCUS_ATTRIBUTE}]`)].filter((element) => element.getAttribute(WAYPOINT_FOCUS_ATTRIBUTE) === waypointId)

const visibleShareOf = (waypointId: string): number => {
  const rects = focusElementsOf(waypointId).map((element) => element.getBoundingClientRect())
  if (rects.length === 0) return 0
  const top = Math.min(...rects.map((rect) => rect.top))
  const bottom = Math.max(...rects.map((rect) => rect.bottom))
  const visible = Math.max(0, Math.min(bottom, window.innerHeight) - Math.max(top, coveredTopOf()))
  return visible / Math.max(1, bottom - top)
}

const waypointsOf = (segment: SteppedSegment): SteppedWaypoint[] =>
  segment.walkthrough.files.flatMap((file) => file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : [])))

export const waypointAnchorIdsOf = (segments: readonly SteppedSegment[]): string[] =>
  segments.flatMap(waypointsOf).map((waypoint) => waypoint.anchorId)

const holdsWaypoint = (file: SteppedFile, waypointId: string | null): boolean =>
  file.rows.some((row) => row.kind === "waypoint" && row.waypoint.id === waypointId)

const fileHoldingWaypoint = (segments: readonly SteppedSegment[], waypointId: string | null): string | null =>
  segments.flatMap((segment) => segment.walkthrough.files).find((file) => holdsWaypoint(file, waypointId))?.anchorId ?? null

const stepTargetsOf = (waypoints: readonly SteppedWaypoint[], current: SteppedWaypoint | null, aboveAnchorIds: ReadonlySet<string>): StepTargets =>
  current === null
    ? {
        previousId: waypoints.filter((waypoint) => aboveAnchorIds.has(waypoint.anchorId)).at(-1)?.id ?? null,
        nextId: waypoints.find((waypoint) => !aboveAnchorIds.has(waypoint.anchorId))?.id ?? null,
      }
    : { previousId: current.previousId, nextId: current.nextId }

const useFocusRelease = (focusedWaypointId: string | null, visit: WaypointVisit | null, onRelease: () => void): void => {
  const settledScrollYRef = useRef<number | null>(null)

  useEffect(() => {
    settledScrollYRef.current = null
    if (focusedWaypointId === null) return undefined
    const settle = (): void => {
      if (settledScrollYRef.current !== null) return
      settledScrollYRef.current = window.scrollY
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

const releaseFocus = (store: WalkthroughStore) => (): void => {
  updateWalkthrough(store, withoutFocus)
}

export const useVisitScrolling = (store: WalkthroughStore): void => {
  const visit = useStore(store, (state) => state.visit)
  const focusedWaypointId = useStore(store, (state) => state.focusedWaypointId)
  const [onRelease] = useState(() => releaseFocus(store))

  useEffect(() => {
    if (visit !== null) scrollToAnchor(visit.anchorId)
  }, [visit])

  useFocusRelease(focusedWaypointId, visit, onRelease)
}

export const useWaypointStepping = (segments: readonly SteppedSegment[]): WaypointStepping => {
  const [store] = useState(createWalkthroughStore)
  const waypoints = segments.flatMap(waypointsOf)

  useLayoutEffect(() => {
    updateWalkthrough(store, (state) => withHoldingFile(state, fileHoldingWaypoint(segments, state.currentWaypointId)))
  }, [store, segments])

  const visitWaypoint = (waypointId: string | null, isOpening: boolean): void => {
    const waypoint = waypoints.find((candidate) => candidate.id === waypointId)
    if (waypoint === undefined) return
    updateWalkthrough(store, (state) => withVisit(state, waypoint, isOpening, fileHoldingWaypoint(segments, waypoint.id)))
  }

  return {
    store,
    steppingOf: (segment, currentWaypointId, aboveAnchorIds) => {
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
      updateWalkthrough(store, (state) => withSectionEntered(state, first.id, fileHoldingWaypoint(segments, first.id)))
    },
    onVisitWaypoint: (waypointId) => { visitWaypoint(waypointId, false) },
    onToggleWaypoint: (waypointId) => {
      updateWalkthrough(store, (state) => withToggledWaypoint(state, waypointId, fileHoldingWaypoint(segments, waypointId)))
    },
    onPreviewWaypoint: (waypointId) => {
      updateWalkthrough(store, (state) => withPreviewedWaypoint(state, waypointId, fileHoldingWaypoint(segments, waypointId)))
    },
    onCurrentOpenChange: (isOpen) => {
      const { currentWaypointId } = store.getState()
      if (!isOpen) updateWalkthrough(store, withoutCurrentOpen)
      visitWaypoint(currentWaypointId, isOpen)
    },
    onOpenCodeLink: (anchorId) => {
      const waypoint = waypoints.find((candidate) => candidate.anchorId === anchorId)
      if (waypoint === undefined) scrollToAnchor(anchorId)
      else visitWaypoint(waypoint.id, true)
    },
  }
}
