import type { ReactNode } from "react"
import {
  BACK_KEY,
  navigatorButtonOf,
  NEXT_KEY,
  WRITE_UP_BLOCK_KEY,
  WRITE_UP_KEY,
  type ChangeTone,
  type NavigatorBadge,
  type NavigatorButton,
  type NavigatorChoice,
  type NavigatorControl,
  type NavigatorGroup,
  type NavigatorMenuItem,
  type NavigatorSubmenu,
  type SectionSteps,
} from "@/lib/navigator-controls"

type FindingFilterKey = "core-change" | "bug" | "risk" | "nit" | "question"

const FINDING_FILTER_KEYS: readonly FindingFilterKey[] = ["core-change", "bug", "risk", "nit", "question"]

interface FilterOption {
  readonly key: string
  readonly label: string
  readonly detailLabel: string
  readonly detailChange: ChangeTone | null
  readonly isSelected: boolean
  readonly toggledKeys: readonly string[]
}

interface FilterSubmenu {
  readonly id: string
  readonly label: string
  readonly heading: string
  readonly valueLabel: string | null
  readonly options: readonly FilterOption[]
}

export interface WalkthroughControls {
  readonly filter: {
    readonly buttonLabel: string
    readonly badge: NavigatorBadge | null
    readonly heading: string
    readonly groups: readonly {
      readonly id: string
      readonly options: readonly FilterOption[]
      readonly more: FilterSubmenu | null
    }[]
    readonly submenus: readonly FilterSubmenu[]
  }
  readonly reviewedToggle: { readonly label: string, readonly countLabel: string, readonly isShown: boolean, readonly isAvailable: boolean }
  readonly stepping: { readonly previousLabel: string, readonly nextLabel: string }
  readonly currentReview: { readonly markLabel: string, readonly reviewedLabel: string }
}

export type WriteUpScope = "line" | "block"

export interface WalkthroughNavigationRequest {
  readonly controls: WalkthroughControls
  readonly positionLabel: string | null
  readonly canStepBack: boolean
  readonly canStepForward: boolean
  readonly currentWaypoint: {
    readonly isReviewed: boolean
    readonly isOpen: boolean
    readonly canComment: boolean
    readonly canWriteUp: boolean
    readonly canWriteUpBlock: boolean
  } | null
  readonly areFilesCollapsed: boolean
  readonly isFileCollapsed: boolean | null
  readonly markerOf: (key: FindingFilterKey | "reviewed") => ReactNode
  readonly sectionSteps: SectionSteps
  readonly onPrevious: () => void
  readonly onNext: () => void
  readonly onCurrentReviewedChange: ((isReviewed: boolean) => void) | null
  readonly onCommentOnCurrent: (() => void) | null
  readonly onWriteUpCurrent: ((scope: WriteUpScope) => void) | null
  readonly onFilterChange: ((keys: readonly string[] | null) => void) | null
  readonly onShowReviewedChange: ((isShown: boolean) => void) | null
  readonly onFilesCollapsedChange: (isCollapsed: boolean) => void
  readonly onFileCollapsedChange: (isCollapsed: boolean) => void
  readonly onCurrentOpenChange: (isOpen: boolean) => void
}

const REVIEW_KEY = "s"
const COMMENT_KEY = "c"
const FILTER_KEY = "f"
const FILES_KEY = "q"
const FILE_KEY = "e"
export const WAYPOINT_KEY = "r"
const ADD_COMMENT_LABEL = "Add comment"
const WRITE_UP_LINE_LABEL = "Write up this line"
const WRITE_UP_BLOCK_LABEL = "Write up the whole code block"
const WRITE_UP_SHORT_LABEL = "Write up"
const WRITE_UP_BLOCK_SHORT_LABEL = "Write up block"
const COLLAPSE_ALL_LABEL = "Collapse all"
const EXPAND_ALL_LABEL = "Expand all"
const COLLAPSE_FILE_LABEL = "Collapse file"
const EXPAND_FILE_LABEL = "Expand file"
const EXPAND_WAYPOINT_LABEL = "Expand waypoint"
const COLLAPSE_WAYPOINT_LABEL = "Collapse waypoint"
const REVIEWED_CHOICE_ID = "reviewed"
const PICK_WAYPOINT_HINT = `Pick a waypoint first: press ${NEXT_KEY.toUpperCase()} to step to the next one.`
const NO_LINES_HINT = "This waypoint has no lines on the page to comment on."

const stepButtonOf = (canStep: boolean, sectionStep: NavigatorButton | null, waypointStep: NavigatorButton): NavigatorButton =>
  canStep || sectionStep === null ? waypointStep : sectionStep

const steppingGroupOf = (request: WalkthroughNavigationRequest): NavigatorGroup => {
  const { stepping } = request.controls
  const position: NavigatorControl[] = request.positionLabel === null ? [] : [{ kind: "position", label: request.positionLabel }]
  return [
    stepButtonOf(
      request.canStepBack,
      request.sectionSteps.back,
      navigatorButtonOf({ key: BACK_KEY, label: stepping.previousLabel, isDisabled: !request.canStepBack, onRun: request.onPrevious }),
    ),
    ...position,
    stepButtonOf(
      request.canStepForward,
      request.sectionSteps.next,
      navigatorButtonOf({ key: NEXT_KEY, label: stepping.nextLabel, isDisabled: !request.canStepForward, onRun: request.onNext }),
    ),
  ]
}

const reviewButtonsOf = (request: WalkthroughNavigationRequest): NavigatorButton[] => {
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
      isDisabled: currentWaypoint === null,
      disabledHint: PICK_WAYPOINT_HINT,
      onRun: () => { onCurrentReviewedChange(!isReviewed) },
    }),
  ]
}

const commentButtonsOf = (request: WalkthroughNavigationRequest): NavigatorButton[] => {
  const { onCommentOnCurrent, currentWaypoint } = request
  if (onCommentOnCurrent === null) return []
  return [
    navigatorButtonOf({
      key: COMMENT_KEY,
      label: ADD_COMMENT_LABEL,
      isDisabled: currentWaypoint?.canComment !== true,
      disabledHint: currentWaypoint === null ? PICK_WAYPOINT_HINT : NO_LINES_HINT,
      onRun: onCommentOnCurrent,
    }),
  ]
}

const writeUpButtonsOf = (request: WalkthroughNavigationRequest): NavigatorButton[] => {
  const { onWriteUpCurrent, currentWaypoint } = request
  if (onWriteUpCurrent === null || currentWaypoint?.canWriteUp !== true) return []
  const lineButton = navigatorButtonOf({
    key: WRITE_UP_KEY,
    label: WRITE_UP_LINE_LABEL,
    shortLabel: WRITE_UP_SHORT_LABEL,
    onRun: () => { onWriteUpCurrent("line") },
  })
  const blockButton = navigatorButtonOf({
    key: WRITE_UP_BLOCK_KEY,
    label: WRITE_UP_BLOCK_LABEL,
    shortLabel: WRITE_UP_BLOCK_SHORT_LABEL,
    onRun: () => { onWriteUpCurrent("block") },
  })
  return currentWaypoint.canWriteUpBlock ? [lineButton, blockButton] : [lineButton]
}

const reviewGroupOf = (request: WalkthroughNavigationRequest): NavigatorGroup => [
  ...reviewButtonsOf(request),
  ...commentButtonsOf(request),
  ...writeUpButtonsOf(request),
]

const reviewedChoicesOf = (request: WalkthroughNavigationRequest): NavigatorChoice[] => {
  const { onShowReviewedChange } = request
  const toggle = request.controls.reviewedToggle
  return onShowReviewedChange === null
    ? []
    : [{
        kind: "choice",
        id: REVIEWED_CHOICE_ID,
        label: toggle.label,
        detailLabel: toggle.countLabel,
        detailTone: null,
        marker: request.markerOf("reviewed"),
        isChecked: toggle.isShown,
        isDisabled: !toggle.isAvailable && !toggle.isShown,
        onToggle: () => { onShowReviewedChange(!toggle.isShown) },
      }]
}

const isFindingFilterKey = (key: string): key is FindingFilterKey =>
  FINDING_FILTER_KEYS.some((findingKey) => findingKey === key)

const filterChoiceOf = (request: WalkthroughNavigationRequest, onFilterChange: (keys: readonly string[] | null) => void) => (option: FilterOption): NavigatorChoice => ({
  kind: "choice",
  id: option.key,
  label: option.label,
  detailLabel: option.detailLabel,
  detailTone: option.detailChange,
  marker: isFindingFilterKey(option.key) ? request.markerOf(option.key) : null,
  isChecked: option.isSelected,
  isDisabled: false,
  onToggle: () => { onFilterChange(option.toggledKeys.length === 0 ? null : option.toggledKeys) },
})

const filterGroupOf = (request: WalkthroughNavigationRequest): NavigatorGroup => {
  const { onFilterChange } = request
  if (onFilterChange === null) return []
  const { filter } = request.controls
  const choiceOf = filterChoiceOf(request, onFilterChange)
  const submenuOf = (submenu: FilterSubmenu): NavigatorSubmenu => ({
    kind: "submenu",
    id: submenu.id,
    label: submenu.label,
    heading: submenu.heading,
    valueLabel: submenu.valueLabel,
    choices: submenu.options.map(choiceOf),
  })
  const groupItems: NavigatorMenuItem[][] = filter.groups.map((group) => [
    ...group.options.map(choiceOf),
    ...(group.more === null ? [] : [submenuOf(group.more)]),
  ])
  return [{
    kind: "menu",
    key: FILTER_KEY,
    label: filter.buttonLabel,
    badge: filter.badge,
    heading: filter.heading,
    itemGroups: [...groupItems, filter.submenus.map(submenuOf), reviewedChoicesOf(request)].filter((items) => items.length > 0),
  }]
}

const layoutGroupOf = (request: WalkthroughNavigationRequest): NavigatorGroup => {
  const { isFileCollapsed, currentWaypoint } = request
  const isCurrentOpen = currentWaypoint?.isOpen === true
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
      key: WAYPOINT_KEY,
      label: isCurrentOpen ? COLLAPSE_WAYPOINT_LABEL : EXPAND_WAYPOINT_LABEL,
      isDisabled: currentWaypoint === null,
      disabledHint: PICK_WAYPOINT_HINT,
      onRun: () => { request.onCurrentOpenChange(!isCurrentOpen) },
    }),
  ]
}

export const walkthroughNavigationOf = (request: WalkthroughNavigationRequest): NavigatorGroup[] => [
  steppingGroupOf(request),
  reviewGroupOf(request),
  filterGroupOf(request),
  layoutGroupOf(request),
].filter((group) => group.length > 0)
