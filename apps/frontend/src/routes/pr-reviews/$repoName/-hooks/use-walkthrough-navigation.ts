import { useState } from "react"
import type { WalkthroughNavigation } from "@flightplan/ui/CodeWalkthrough"
import type { WalkthroughControls } from "@flightplan/ui/lib/walkthrough-navigation"
import type { WaypointStepping } from "./use-waypoint-stepping"

type FilterKeys = Parameters<NonNullable<WalkthroughNavigation["onFilterChange"]>>[0]

interface NavigatedWaypoint {
  readonly id: string
  readonly isReviewed: boolean
}

type NavigatedRow = { readonly kind: "waypoint", readonly waypoint: NavigatedWaypoint } | { readonly kind: "lines" | "gap" }

interface NavigatedFile {
  readonly anchorId: string
  readonly rows: readonly NavigatedRow[]
}

interface NavigatedSegment {
  readonly walkthrough: { readonly files: readonly NavigatedFile[] }
}

interface WalkthroughHandlers {
  readonly onReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
  readonly onFilterChange: ((keys: FilterKeys) => void) | null
  readonly onShowReviewedChange: ((isShown: boolean) => void) | null
}

interface Collapse {
  readonly collapsedAnchorIds: ReadonlySet<string>
  readonly holdingAnchorId: string | null
}

export interface WalkthroughLayout {
  readonly areWaypointsHidden: boolean
  readonly isFileCollapsed: (anchorId: string) => boolean
  readonly onFileCollapsedChange: (anchorId: string, isCollapsed: boolean) => void
  readonly navigationOf: (segment: NavigatedSegment, controls: WalkthroughControls) => WalkthroughNavigation
}

const NOTHING_COLLAPSED: ReadonlySet<string> = new Set()

const holdsWaypoint = (file: NavigatedFile, waypointId: string | null): boolean =>
  file.rows.some((row) => row.kind === "waypoint" && row.waypoint.id === waypointId)

const fileHoldingWaypoint = (segments: readonly NavigatedSegment[], waypointId: string | null): string | null =>
  segments.flatMap((segment) => segment.walkthrough.files).find((file) => holdsWaypoint(file, waypointId))?.anchorId ?? null

const waypointOf = (segments: readonly NavigatedSegment[], waypointId: string | null): NavigatedWaypoint | null =>
  segments
    .flatMap((segment) => segment.walkthrough.files.flatMap((file) => file.rows))
    .flatMap((row) => (row.kind === "waypoint" && row.waypoint.id === waypointId ? [row.waypoint] : []))
    .at(0) ?? null

const withCollapse = (anchorIds: ReadonlySet<string>, changedAnchorIds: readonly string[], isCollapsed: boolean): ReadonlySet<string> =>
  new Set(isCollapsed ? [...anchorIds, ...changedAnchorIds] : [...anchorIds].filter((anchorId) => !changedAnchorIds.includes(anchorId)))

const fileUnderBandOf = (files: readonly NavigatedFile[], currentAnchorId: string | null): string | null =>
  files.find((file) => file.anchorId === currentAnchorId)?.anchorId ?? files.at(0)?.anchorId ?? null

export const useWalkthroughNavigation = (
  segments: readonly NavigatedSegment[],
  stepping: WaypointStepping,
  currentAnchorId: string | null,
  handlers: WalkthroughHandlers,
): WalkthroughLayout => {
  const [areWaypointsHidden, setAreWaypointsHidden] = useState(false)
  const holdingAnchorId = fileHoldingWaypoint(segments, stepping.currentWaypointId)
  const [collapse, setCollapse] = useState<Collapse>({ collapsedAnchorIds: NOTHING_COLLAPSED, holdingAnchorId })
  if (collapse.holdingAnchorId !== holdingAnchorId) {
    setCollapse({
      collapsedAnchorIds: holdingAnchorId === null ? collapse.collapsedAnchorIds : withCollapse(collapse.collapsedAnchorIds, [holdingAnchorId], false),
      holdingAnchorId,
    })
  }
  const { collapsedAnchorIds } = collapse
  const changeCollapse = (anchorIds: readonly string[], isCollapsed: boolean): void => {
    setCollapse((current) => ({ ...current, collapsedAnchorIds: withCollapse(current.collapsedAnchorIds, anchorIds, isCollapsed) }))
  }
  const stepShowingWaypoints = (step: () => void) => (): void => {
    setAreWaypointsHidden(false)
    step()
  }
  const currentWaypoint = waypointOf(segments, stepping.currentWaypointId)
  const { onReviewedChange } = handlers

  return {
    areWaypointsHidden,
    isFileCollapsed: (anchorId) => collapsedAnchorIds.has(anchorId),
    onFileCollapsedChange: (anchorId, isCollapsed) => { changeCollapse([anchorId], isCollapsed) },
    navigationOf: (segment, controls) => {
      const fileAnchorIds = segment.walkthrough.files.map((file) => file.anchorId)
      const fileUnderBand = fileUnderBandOf(segment.walkthrough.files, currentAnchorId)
      return {
        controls,
        positionLabel: stepping.positionLabel,
        canStepBack: stepping.canStepBack,
        canStepForward: stepping.canStepForward,
        currentWaypoint,
        areFilesCollapsed: fileAnchorIds.length > 0 && fileAnchorIds.every((anchorId) => collapsedAnchorIds.has(anchorId)),
        isFileCollapsed: fileUnderBand === null ? null : collapsedAnchorIds.has(fileUnderBand),
        areWaypointsHidden,
        onPrevious: stepShowingWaypoints(stepping.onPrevious),
        onNext: stepShowingWaypoints(stepping.onNext),
        onCurrentReviewedChange: onReviewedChange === null
          ? null
          : (isReviewed) => {
              if (currentWaypoint === null) return
              if (isReviewed && !controls.reviewedToggle.isShown) stepping.onNext()
              onReviewedChange(currentWaypoint.id, isReviewed)
            },
        onFilterChange: handlers.onFilterChange,
        onShowReviewedChange: handlers.onShowReviewedChange,
        onFilesCollapsedChange: (isCollapsed) => { changeCollapse(fileAnchorIds, isCollapsed) },
        onFileCollapsedChange: (isCollapsed) => {
          if (fileUnderBand !== null) changeCollapse([fileUnderBand], isCollapsed)
        },
        onWaypointsHiddenChange: setAreWaypointsHidden,
      }
    },
  }
}
