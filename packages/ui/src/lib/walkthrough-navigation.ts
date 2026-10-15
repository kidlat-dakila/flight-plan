import type { ReactNode } from "react"
import { navigatorButtonOf, type NavigatorChoice, type NavigatorControl, type NavigatorGroup } from "@/lib/navigator-controls"

type FilterKey = "attention" | "bug" | "risk" | "nit" | "question"

export interface WalkthroughControls {
  readonly filter: {
    readonly buttonLabel: string
    readonly valueLabel: string | null
    readonly heading: string
    readonly hint: string
    readonly options: readonly {
      readonly key: FilterKey
      readonly label: string
      readonly countLabel: string
      readonly isSelected: boolean
      readonly toggledKeys: readonly FilterKey[]
    }[]
  }
  readonly reviewedToggle: { readonly label: string, readonly countLabel: string, readonly isShown: boolean, readonly isAvailable: boolean }
  readonly stepping: { readonly previousLabel: string, readonly nextLabel: string }
  readonly currentReview: { readonly markLabel: string, readonly reviewedLabel: string }
}

export interface WalkthroughNavigationRequest {
  readonly controls: WalkthroughControls
  readonly positionLabel: string | null
  readonly canStepBack: boolean
  readonly canStepForward: boolean
  readonly currentWaypoint: { readonly isReviewed: boolean } | null
  readonly areFilesCollapsed: boolean
  readonly isFileCollapsed: boolean | null
  readonly areWaypointsHidden: boolean
  readonly markerOf: (key: FilterKey | "reviewed") => ReactNode
  readonly onPrevious: () => void
  readonly onNext: () => void
  readonly onCurrentReviewedChange: ((isReviewed: boolean) => void) | null
  readonly onFilterChange: ((keys: readonly FilterKey[] | null) => void) | null
  readonly onShowReviewedChange: ((isShown: boolean) => void) | null
  readonly onFilesCollapsedChange: (isCollapsed: boolean) => void
  readonly onFileCollapsedChange: (isCollapsed: boolean) => void
  readonly onWaypointsHiddenChange: (isHidden: boolean) => void
}

const PREVIOUS_KEY = "a"
const NEXT_KEY = "d"
const REVIEW_KEY = "s"
const FILTER_KEY = "f"
const FILES_KEY = "q"
const FILE_KEY = "e"
const WAYPOINTS_KEY = "x"
const COLLAPSE_ALL_LABEL = "Collapse all"
const EXPAND_ALL_LABEL = "Expand all"
const COLLAPSE_FILE_LABEL = "Collapse file"
const EXPAND_FILE_LABEL = "Expand file"
const HIDE_WAYPOINTS_LABEL = "Hide waypoints"
const SHOW_WAYPOINTS_LABEL = "Show waypoints"
const REVIEWED_CHOICE_ID = "reviewed"

const steppingGroupOf = (request: WalkthroughNavigationRequest): NavigatorGroup => {
  const { stepping } = request.controls
  const position: NavigatorControl[] = request.positionLabel === null ? [] : [{ kind: "position", label: request.positionLabel }]
  return [
    navigatorButtonOf({ key: PREVIOUS_KEY, label: stepping.previousLabel, isDisabled: !request.canStepBack, onRun: request.onPrevious }),
    ...position,
    navigatorButtonOf({ key: NEXT_KEY, label: stepping.nextLabel, isDisabled: !request.canStepForward, onRun: request.onNext }),
  ]
}

const reviewGroupOf = (request: WalkthroughNavigationRequest): NavigatorGroup => {
  const { onCurrentReviewedChange, currentWaypoint } = request
  if (onCurrentReviewedChange === null) return []
  const isReviewed = currentWaypoint?.isReviewed === true
  const { currentReview } = request.controls
  return [
    navigatorButtonOf({
      key: REVIEW_KEY,
      label: isReviewed ? currentReview.reviewedLabel : currentReview.markLabel,
      isPressed: isReviewed,
      isPrimary: !isReviewed,
      isDisabled: currentWaypoint === null || request.areWaypointsHidden,
      onRun: () => { onCurrentReviewedChange(!isReviewed) },
    }),
  ]
}

const reviewedChoicesOf = (request: WalkthroughNavigationRequest): NavigatorChoice[] => {
  const { onShowReviewedChange } = request
  const toggle = request.controls.reviewedToggle
  return onShowReviewedChange === null
    ? []
    : [{
        id: REVIEWED_CHOICE_ID,
        label: toggle.label,
        countLabel: toggle.countLabel,
        marker: request.markerOf("reviewed"),
        isChecked: toggle.isShown,
        isDisabled: !toggle.isAvailable && !toggle.isShown,
        onToggle: () => { onShowReviewedChange(!toggle.isShown) },
      }]
}

const filterGroupOf = (request: WalkthroughNavigationRequest): NavigatorGroup => {
  const { onFilterChange } = request
  if (onFilterChange === null) return []
  const { filter } = request.controls
  const kindChoices: NavigatorChoice[] = filter.options.map((option) => ({
    id: option.key,
    label: option.label,
    countLabel: option.countLabel,
    marker: request.markerOf(option.key),
    isChecked: option.isSelected,
    isDisabled: false,
    onToggle: () => { onFilterChange(option.toggledKeys.length === 0 ? null : option.toggledKeys) },
  }))
  const reviewedChoices = reviewedChoicesOf(request)
  return [{
    kind: "menu",
    key: FILTER_KEY,
    label: filter.buttonLabel,
    valueLabel: filter.valueLabel,
    heading: filter.heading,
    hint: filter.hint,
    choiceGroups: reviewedChoices.length === 0 ? [kindChoices] : [kindChoices, reviewedChoices],
  }]
}

const layoutGroupOf = (request: WalkthroughNavigationRequest): NavigatorGroup => {
  const { isFileCollapsed, areWaypointsHidden } = request
  const fileButton = isFileCollapsed === null
    ? []
    : [navigatorButtonOf({
        key: FILE_KEY,
        label: isFileCollapsed ? EXPAND_FILE_LABEL : COLLAPSE_FILE_LABEL,
        onRun: () => { request.onFileCollapsedChange(!isFileCollapsed) },
      })]
  return [
    navigatorButtonOf({
      key: FILES_KEY,
      label: request.areFilesCollapsed ? EXPAND_ALL_LABEL : COLLAPSE_ALL_LABEL,
      onRun: () => { request.onFilesCollapsedChange(!request.areFilesCollapsed) },
    }),
    ...fileButton,
    navigatorButtonOf({
      key: WAYPOINTS_KEY,
      label: areWaypointsHidden ? SHOW_WAYPOINTS_LABEL : HIDE_WAYPOINTS_LABEL,
      isPressed: areWaypointsHidden,
      onRun: () => { request.onWaypointsHiddenChange(!areWaypointsHidden) },
    }),
  ]
}

export const walkthroughNavigationOf = (request: WalkthroughNavigationRequest): NavigatorGroup[] => [
  steppingGroupOf(request),
  reviewGroupOf(request),
  filterGroupOf(request),
  layoutGroupOf(request),
].filter((group) => group.length > 0)
