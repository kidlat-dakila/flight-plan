import { useLayoutEffect, useRef, useState } from "react"
import type { WalkthroughNavigation } from "@flightplan/ui/CodeWalkthrough"
import type { CommentRange, WriteUpTarget } from "@flightplan/ui/FileRows"
import type { WalkthroughControls, WriteUpScope } from "@flightplan/ui/lib/walkthrough-navigation"
import type { SteppedWaypoint, WaypointStepping } from "./use-waypoint-stepping"

type FilterKeys = Parameters<NonNullable<WalkthroughNavigation["onFilterChange"]>>[0]

interface NavigatedWaypoint extends SteppedWaypoint {
  readonly isReviewed: boolean
  readonly lines: { readonly lineStart: number, readonly lineEnd: number } | null
  readonly reading: unknown
  readonly isBeingWritten: boolean
}

type NavigatedRow
  = | { readonly kind: "waypoint", readonly waypoint: NavigatedWaypoint, readonly rootBlockId: string | null }
    | { readonly kind: "lines" | "gap" }

interface NavigatedFile {
  readonly anchorId: string
  readonly path: string
  readonly rows: readonly NavigatedRow[]
}

interface NavigatedSegment {
  readonly id: string
  readonly walkthrough: { readonly anchorId: string, readonly controls: WalkthroughControls, readonly files: readonly NavigatedFile[] }
}

interface WalkthroughHandlers {
  readonly onReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
  readonly onFilterChange: ((segmentId: string, keys: FilterKeys) => void) | null
  readonly onShowReviewedChange: ((segmentId: string, isShown: boolean) => void) | null
  readonly onCommentOnWaypoint: ((path: string, range: CommentRange) => void) | null
  readonly onWriteUp: ((target: WriteUpTarget) => void) | null
}

interface Collapse {
  readonly collapsedAnchorIds: ReadonlySet<string>
  readonly holdingAnchorId: string | null
}

export interface WalkthroughLayout {
  readonly isFileCollapsed: (anchorId: string) => boolean
  readonly onFileCollapsedChange: (anchorId: string, isCollapsed: boolean) => void
  readonly navigationOf: (segment: NavigatedSegment) => WalkthroughNavigation
}

interface HeldPlace {
  readonly anchorId: string
  readonly count: number
}

const NOTHING_COLLAPSED: ReadonlySet<string> = new Set()
const FILE_HEADER_TOP_PX = 56

const isReadInto = (anchorId: string): boolean => {
  const rect = document.getElementById(anchorId)?.getBoundingClientRect()
  return rect !== undefined && rect.height > 0 && rect.top < FILE_HEADER_TOP_PX
}

interface PlaceKeeping {
  readonly holdPlace: (anchorId: string | null) => void
  readonly holdPlaceThroughRefresh: (anchorId: string) => void
}

const scrollInstantlyTo = (anchorId: string): void => {
  document.getElementById(anchorId)?.scrollIntoView({ block: "start", behavior: "instant" })
}

const usePlaceKeeping = (segments: readonly NavigatedSegment[]): PlaceKeeping => {
  const [heldPlace, setHeldPlace] = useState<HeldPlace | null>(null)
  const awaitedAnchorIdRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    if (heldPlace !== null) scrollInstantlyTo(heldPlace.anchorId)
  }, [heldPlace])

  useLayoutEffect(() => {
    const awaitedAnchorId = awaitedAnchorIdRef.current
    if (awaitedAnchorId === null) return
    awaitedAnchorIdRef.current = null
    scrollInstantlyTo(awaitedAnchorId)
  }, [segments])

  return {
    holdPlace: (anchorId) => {
      if (anchorId !== null && isReadInto(anchorId)) setHeldPlace((previous) => ({ anchorId, count: (previous?.count ?? 0) + 1 }))
    },
    holdPlaceThroughRefresh: (anchorId) => {
      awaitedAnchorIdRef.current = isReadInto(anchorId) ? anchorId : null
    },
  }
}

const holdsWaypoint = (file: NavigatedFile, waypointId: string | null): boolean =>
  file.rows.some((row) => row.kind === "waypoint" && row.waypoint.id === waypointId)

const fileHoldingWaypoint = (segments: readonly NavigatedSegment[], waypointId: string | null): string | null =>
  segments.flatMap((segment) => segment.walkthrough.files).find((file) => holdsWaypoint(file, waypointId))?.anchorId ?? null

interface WaypointPlace {
  readonly path: string
  readonly waypoint: NavigatedWaypoint
  readonly rootBlockId: string | null
}

const placeOfWaypoint = (segments: readonly NavigatedSegment[], waypointId: string | null): WaypointPlace | null =>
  segments
    .flatMap((segment) => segment.walkthrough.files)
    .flatMap((file) => file.rows.flatMap((row) => (row.kind === "waypoint" && row.waypoint.id === waypointId ? [{ path: file.path, waypoint: row.waypoint, rootBlockId: row.rootBlockId }] : [])))
    .at(0) ?? null

const commentRangeOf = (lines: NonNullable<NavigatedWaypoint["lines"]>): CommentRange => ({
  side: "new",
  startLineLabel: String(lines.lineStart),
  lineLabel: String(lines.lineEnd),
})

const isUnwritten = (waypoint: NavigatedWaypoint): boolean => waypoint.reading === null && !waypoint.isBeingWritten

const writeUpTargetOf = (place: WaypointPlace, scope: WriteUpScope): WriteUpTarget | null => {
  if (scope === "line") return { kind: "waypoint", waypointId: place.waypoint.id }
  return place.rootBlockId === null ? null : { kind: "root-block", rootBlockId: place.rootBlockId }
}

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
  const holdingAnchorId = fileHoldingWaypoint(segments, stepping.currentWaypointId)
  const [collapse, setCollapse] = useState<Collapse>({ collapsedAnchorIds: NOTHING_COLLAPSED, holdingAnchorId })
  if (collapse.holdingAnchorId !== holdingAnchorId) {
    setCollapse({
      collapsedAnchorIds: holdingAnchorId === null ? collapse.collapsedAnchorIds : withCollapse(collapse.collapsedAnchorIds, [holdingAnchorId], false),
      holdingAnchorId,
    })
  }
  const { collapsedAnchorIds } = collapse
  const { holdPlace, holdPlaceThroughRefresh } = usePlaceKeeping(segments)
  const changeCollapse = (anchorIds: readonly string[], isCollapsed: boolean, readAnchorId: string | null): void => {
    holdPlace(readAnchorId)
    setCollapse((current) => ({ ...current, collapsedAnchorIds: withCollapse(current.collapsedAnchorIds, anchorIds, isCollapsed) }))
  }
  const currentPlace = placeOfWaypoint(segments, stepping.currentWaypointId)
  const currentWaypoint = currentPlace?.waypoint ?? null
  const { onReviewedChange, onFilterChange, onShowReviewedChange, onCommentOnWaypoint, onWriteUp } = handlers

  return {
    isFileCollapsed: (anchorId) => collapsedAnchorIds.has(anchorId),
    onFileCollapsedChange: (anchorId, isCollapsed) => { changeCollapse([anchorId], isCollapsed, anchorId) },
    navigationOf: (segment) => {
      const { controls } = segment.walkthrough
      const fileAnchorIds = segment.walkthrough.files.map((file) => file.anchorId)
      const fileUnderBand = fileUnderBandOf(segment.walkthrough.files, currentAnchorId)
      const segmentStepping = stepping.steppingOf(segment)
      return {
        controls,
        positionLabel: segmentStepping.positionLabel,
        canStepBack: segmentStepping.canStepBack,
        canStepForward: segmentStepping.canStepForward,
        currentWaypoint: currentWaypoint === null
          ? null
          : {
              isReviewed: currentWaypoint.isReviewed,
              isOpen: stepping.openWaypointIds.has(currentWaypoint.id),
              canComment: currentWaypoint.lines !== null,
              canWriteUp: isUnwritten(currentWaypoint),
              canWriteUpBlock: currentPlace?.rootBlockId != null,
            },
        areFilesCollapsed: fileAnchorIds.length > 0 && fileAnchorIds.every((anchorId) => collapsedAnchorIds.has(anchorId)),
        isFileCollapsed: fileUnderBand === null ? null : collapsedAnchorIds.has(fileUnderBand),
        onPrevious: segmentStepping.onPrevious,
        onNext: segmentStepping.onNext,
        onCurrentReviewedChange: onReviewedChange === null
          ? null
          : (isReviewed) => {
              if (currentWaypoint === null) return
              if (isReviewed && !controls.reviewedToggle.isShown) segmentStepping.onNext()
              onReviewedChange(currentWaypoint.id, isReviewed)
            },
        onCommentOnCurrent: onCommentOnWaypoint === null
          ? null
          : () => {
              if (currentPlace?.waypoint.lines == null) return
              onCommentOnWaypoint(currentPlace.path, commentRangeOf(currentPlace.waypoint.lines))
            },
        onWriteUpCurrent: onWriteUp === null
          ? null
          : (scope) => {
              const target = currentPlace === null ? null : writeUpTargetOf(currentPlace, scope)
              if (target !== null) onWriteUp(target)
            },
        onFilterChange: onFilterChange === null
          ? null
          : (keys) => {
              holdPlaceThroughRefresh(segment.walkthrough.anchorId)
              onFilterChange(segment.id, keys)
            },
        onShowReviewedChange: onShowReviewedChange === null
          ? null
          : (isShown) => {
              holdPlaceThroughRefresh(segment.walkthrough.anchorId)
              onShowReviewedChange(segment.id, isShown)
            },
        onFilesCollapsedChange: (isCollapsed) => { changeCollapse(fileAnchorIds, isCollapsed, segment.walkthrough.anchorId) },
        onFileCollapsedChange: (isCollapsed) => {
          if (fileUnderBand !== null) changeCollapse([fileUnderBand], isCollapsed, fileUnderBand)
        },
        onCurrentOpenChange: stepping.onCurrentOpenChange,
      }
    },
  }
}
