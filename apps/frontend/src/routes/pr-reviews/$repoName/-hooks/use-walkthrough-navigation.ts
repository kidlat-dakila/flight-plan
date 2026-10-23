import { useLayoutEffect, useRef } from "react"
import { useStore } from "zustand"
import type { WalkthroughNavigation } from "@flightplan/ui/CodeWalkthrough"
import type { CommentRange, WriteUpTarget } from "@flightplan/ui/FileRows"
import { coveredTopOf } from "@flightplan/ui/lib/pinned-rows"
import type { WalkthroughControls, WriteUpScope } from "@flightplan/ui/lib/walkthrough-navigation"
import type { WaypointFilterNavigation } from "@flightplan/ui/WaypointFilterMenu"
import { firstUnreviewedWaypointIdOf, isFilterApplied } from "./filtered-waypoints"
import type { ReadingPosition } from "./use-reading-position"
import type { SteppedWaypoint, WaypointStepping } from "./use-waypoint-stepping"
import { updateWalkthrough, withFilesCollapsed, type WalkthroughState, type WalkthroughStore } from "./walkthrough-store"

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
  readonly onFilterChange: ((keys: FilterKeys) => void) | null
  readonly onShowReviewedChange: ((isShown: boolean) => void) | null
  readonly onCommentOnWaypoint: ((path: string, range: CommentRange) => void) | null
  readonly onWriteDescription: ((waypointId: string) => void) | null
  readonly onWriteUp: ((target: WriteUpTarget) => void) | null
  readonly agentLabel: string | null
}

export interface WalkthroughLayout {
  readonly onFileCollapsedChange: (anchorId: string, isCollapsed: boolean) => void
  readonly navigationOf: (segment: NavigatedSegment, position: ReadingPosition, state: WalkthroughState) => WalkthroughNavigation
  readonly reviewFilter: WaypointFilterNavigation | null
}

const NO_FILTER_KEYS: readonly string[] = []

const isReadInto = (anchorId: string): boolean => {
  const rect = document.getElementById(anchorId)?.getBoundingClientRect()
  return rect !== undefined && rect.height > 0 && rect.top < coveredTopOf()
}

const readWalkthroughAnchorIdOf = (segments: readonly NavigatedSegment[]): string | null => {
  const anchorIds = segments.map((segment) => segment.walkthrough.anchorId)
  return anchorIds.filter(isReadInto).at(-1) ?? anchorIds.at(0) ?? null
}

const scrollInstantlyTo = (anchorId: string): void => {
  document.getElementById(anchorId)?.scrollIntoView({ block: "start", behavior: "instant" })
}

export const useHeldPlaceScrolling = (store: WalkthroughStore): void => {
  const heldPlace = useStore(store, (state) => state.heldPlace)

  useLayoutEffect(() => {
    if (heldPlace !== null) scrollInstantlyTo(heldPlace.anchorId)
  }, [heldPlace])
}

const useRefreshPlaceKeeping = (segments: readonly NavigatedSegment[]): ((anchorId: string) => void) => {
  const awaitedAnchorIdRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    const awaitedAnchorId = awaitedAnchorIdRef.current
    if (awaitedAnchorId === null) return
    awaitedAnchorIdRef.current = null
    scrollInstantlyTo(awaitedAnchorId)
  }, [segments])

  return (anchorId) => {
    awaitedAnchorIdRef.current = isReadInto(anchorId) ? anchorId : null
  }
}

interface AwaitedFilter {
  readonly keys: readonly string[]
  readonly heldAnchorId: string | null
}

const useFilterLanding = (segments: readonly NavigatedSegment[], onVisitWaypoint: (waypointId: string) => void) => {
  const awaitedFilterRef = useRef<AwaitedFilter | null>(null)

  useLayoutEffect(() => {
    const awaited = awaitedFilterRef.current
    if (awaited === null || !isFilterApplied(segments, awaited.keys)) return
    awaitedFilterRef.current = null
    const firstId = firstUnreviewedWaypointIdOf(segments)
    if (firstId !== null) onVisitWaypoint(firstId)
    else if (awaited.heldAnchorId !== null) scrollInstantlyTo(awaited.heldAnchorId)
  }, [segments, onVisitWaypoint])

  return (keys: readonly string[], anchorId: string): void => {
    awaitedFilterRef.current = { keys, heldAnchorId: isReadInto(anchorId) ? anchorId : null }
  }
}

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

const fileUnderBandOf = (files: readonly NavigatedFile[], currentAnchorId: string | null): string | null =>
  files.find((file) => file.anchorId === currentAnchorId)?.anchorId ?? files.at(0)?.anchorId ?? null

export const useWalkthroughNavigation = (
  segments: readonly NavigatedSegment[],
  stepping: WaypointStepping,
  handlers: WalkthroughHandlers,
): WalkthroughLayout => {
  const holdPlaceThroughRefresh = useRefreshPlaceKeeping(segments)
  const awaitFilter = useFilterLanding(segments, stepping.onVisitWaypoint)
  const changeCollapse = (anchorIds: readonly string[], isCollapsed: boolean, readAnchorId: string | null): void => {
    const heldAnchorId = readAnchorId !== null && isReadInto(readAnchorId) ? readAnchorId : null
    updateWalkthrough(stepping.store, (state) => withFilesCollapsed(state, anchorIds, isCollapsed, heldAnchorId))
  }
  const { onReviewedChange, onFilterChange, onShowReviewedChange, onCommentOnWaypoint, onWriteDescription, onWriteUp, agentLabel } = handlers

  const firstSegment = segments.at(0)
  const reviewFilter: WaypointFilterNavigation | null = firstSegment === undefined
    ? null
    : {
        controls: firstSegment.walkthrough.controls,
        onFilterChange: onFilterChange === null
          ? null
          : (keys) => {
              awaitFilter(keys ?? NO_FILTER_KEYS, readWalkthroughAnchorIdOf(segments) ?? firstSegment.walkthrough.anchorId)
              onFilterChange(keys)
            },
        onShowReviewedChange: onShowReviewedChange === null
          ? null
          : (isShown) => {
              holdPlaceThroughRefresh(readWalkthroughAnchorIdOf(segments) ?? firstSegment.walkthrough.anchorId)
              onShowReviewedChange(isShown)
            },
      }

  return {
    reviewFilter,
    onFileCollapsedChange: (anchorId, isCollapsed) => { changeCollapse([anchorId], isCollapsed, anchorId) },
    navigationOf: (segment, position, state) => {
      const { controls } = segment.walkthrough
      const { collapsedAnchorIds } = state
      const currentPlace = placeOfWaypoint(segments, state.currentWaypointId)
      const currentWaypoint = currentPlace?.waypoint ?? null
      const fileAnchorIds = segment.walkthrough.files.map((file) => file.anchorId)
      const fileUnderBand = fileUnderBandOf(segment.walkthrough.files, position.currentAnchorId)
      const segmentStepping = stepping.steppingOf(segment, state.currentWaypointId, position.aboveAnchorIds)
      return {
        controls,
        positionLabel: segmentStepping.positionLabel,
        canStepBack: segmentStepping.canStepBack,
        canStepForward: segmentStepping.canStepForward,
        currentWaypoint: currentWaypoint === null
          ? null
          : {
              isReviewed: currentWaypoint.isReviewed,
              isOpen: state.openWaypointIds.has(currentWaypoint.id),
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
        onDescribeCurrent: onWriteDescription === null
          ? null
          : () => {
              if (currentWaypoint !== null) onWriteDescription(currentWaypoint.id)
            },
        agentLabel,
        onWriteUpCurrent: onWriteUp === null
          ? null
          : (scope) => {
              const target = currentPlace === null ? null : writeUpTargetOf(currentPlace, scope)
              if (target !== null) onWriteUp(target)
            },
        onFilterChange: onFilterChange === null
          ? null
          : (keys) => {
              awaitFilter(keys ?? NO_FILTER_KEYS, segment.walkthrough.anchorId)
              onFilterChange(keys)
            },
        onShowReviewedChange: onShowReviewedChange === null
          ? null
          : (isShown) => {
              holdPlaceThroughRefresh(segment.walkthrough.anchorId)
              onShowReviewedChange(isShown)
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
