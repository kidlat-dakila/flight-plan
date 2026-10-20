import type { ReactNode } from "react"

export interface NavigatorButton {
  readonly kind: "button"
  readonly key: string
  readonly label: string
  readonly shortLabel: string | null
  readonly description: string | null
  readonly isPressed: boolean
  readonly isPrimary: boolean
  readonly isDisabled: boolean
  readonly disabledHint: string | null
  readonly onRun: () => void
}

export type ChangeTone = "added" | "modified" | "deleted"

export interface NavigatorChoice {
  readonly kind: "choice"
  readonly id: string
  readonly label: string
  readonly detailLabel: string
  readonly detailTone: ChangeTone | null
  readonly marker: ReactNode
  readonly isChecked: boolean
  readonly isDisabled: boolean
  readonly onToggle: () => void
}

export interface NavigatorSubmenu {
  readonly kind: "submenu"
  readonly id: string
  readonly label: string
  readonly heading: string
  readonly valueLabel: string | null
  readonly choices: readonly NavigatorChoice[]
}

export type NavigatorMenuItem = NavigatorChoice | NavigatorSubmenu

export interface NavigatorBadge {
  readonly count: number
  readonly label: string
}

export interface NavigatorMenu {
  readonly kind: "menu"
  readonly key: string
  readonly label: string
  readonly badge: NavigatorBadge | null
  readonly heading: string
  readonly itemGroups: readonly (readonly NavigatorMenuItem[])[]
}

export interface NavigatorPosition {
  readonly kind: "position"
  readonly label: string
}

export type NavigatorControl = NavigatorButton | NavigatorMenu | NavigatorPosition

export type NavigatorGroup = readonly NavigatorControl[]

interface ButtonRequest {
  readonly key: string
  readonly label: string
  readonly shortLabel?: string | null
  readonly description?: string | null
  readonly isPressed?: boolean
  readonly isPrimary?: boolean
  readonly isDisabled?: boolean
  readonly disabledHint?: string | null
  readonly onRun: () => void
}

export const navigatorButtonOf = ({ key, label, shortLabel = null, description = null, isPressed = false, isPrimary = false, isDisabled = false, disabledHint = null, onRun }: ButtonRequest): NavigatorButton => ({
  kind: "button",
  key,
  label,
  shortLabel,
  description,
  isPressed,
  isPrimary,
  isDisabled,
  disabledHint,
  onRun,
})

const choiceSignatureOf = (choice: NavigatorChoice): string => [choice.id, choice.label, choice.detailLabel, choice.detailTone, choice.isChecked, choice.isDisabled].join("|")

const menuItemSignatureOf = (item: NavigatorMenuItem): string =>
  item.kind === "choice"
    ? choiceSignatureOf(item)
    : ["submenu", item.id, item.label, item.heading, item.valueLabel, ...item.choices.map(choiceSignatureOf)].join("|")

const controlSignatureOf = (control: NavigatorControl): string => {
  if (control.kind === "position") return `position|${control.label}`
  if (control.kind === "button") {
    return ["button", control.key, control.label, control.shortLabel, control.description, control.isPressed, control.isPrimary, control.isDisabled, control.disabledHint].join("|")
  }
  return ["menu", control.key, control.label, control.badge?.label, control.heading, ...control.itemGroups.flat().map(menuItemSignatureOf)].join("|")
}

export const navigatorSignatureOf = (groups: readonly NavigatorGroup[]): string =>
  groups.map((group) => group.map(controlSignatureOf).join("\n")).join("\n\n")

export const controlOfKey = (groups: readonly NavigatorGroup[], key: string): NavigatorButton | NavigatorMenu | null =>
  groups.flat().find((control): control is NavigatorButton | NavigatorMenu => control.kind !== "position" && control.key === key) ?? null

export interface SectionSpan {
  readonly anchorId: string
  readonly top: number
  readonly bottom: number
}

export interface ViewportSpan {
  readonly top: number
  readonly bottom: number
}

interface Presence {
  readonly anchorId: string | null
  readonly share: number
  readonly height: number
}

const NOBODY_PRESENT: Presence = { anchorId: null, share: 0, height: 0 }

const visibleHeightOf = (span: SectionSpan, viewport: ViewportSpan): number =>
  Math.max(0, Math.min(span.bottom, viewport.bottom) - Math.max(span.top, viewport.top))

const presenceOf = (span: SectionSpan, viewport: ViewportSpan): Presence => {
  const height = visibleHeightOf(span, viewport)
  const viewportShare = height / Math.max(1, viewport.bottom - viewport.top)
  const ownShare = height / Math.max(1, span.bottom - span.top)
  return { anchorId: span.anchorId, share: Math.max(viewportShare, ownShare), height }
}

const isMorePresent = (candidate: Presence, dominant: Presence): boolean =>
  candidate.share > dominant.share || (candidate.share === dominant.share && candidate.height > dominant.height)

export const dominantAnchorIdOf = (spans: readonly SectionSpan[], viewport: ViewportSpan): string | null =>
  spans
    .map((span) => presenceOf(span, viewport))
    .filter((presence) => presence.height > 0)
    .reduce((dominant, presence) => (isMorePresent(presence, dominant) ? presence : dominant), NOBODY_PRESENT)
    .anchorId

export interface NavigatorRailSection {
  readonly anchorId: string
  readonly label: string
}

export interface NavigatorRailGroup {
  readonly anchorId: string
  readonly label: string | null
  readonly sections: readonly NavigatorRailSection[]
}

export interface NavigatorRail {
  readonly groups: readonly NavigatorRailGroup[]
  readonly sections: readonly NavigatorRailSection[]
}

export interface JumpSection extends NavigatorRailSection {
  readonly isHere: boolean
}

export interface JumpMenu {
  readonly heading: string | null
  readonly sections: readonly JumpSection[]
  readonly otherGroups: readonly NavigatorRailGroup[]
  readonly looseSections: readonly JumpSection[]
}

export const railAnchorIdsOf = (rail: NavigatorRail): string[] => [
  ...rail.groups.flatMap((group) => group.sections.map((section) => section.anchorId)),
  ...rail.sections.map((section) => section.anchorId),
]

const toJumpSection = (dominantAnchorId: string | null) => (section: NavigatorRailSection): JumpSection => ({
  ...section,
  isHere: section.anchorId === dominantAnchorId,
})

export const jumpMenuOf = (rail: NavigatorRail, dominantAnchorId: string | null): JumpMenu => {
  const currentGroup = rail.groups.find((group) => group.sections.some((section) => section.anchorId === dominantAnchorId)) ?? rail.groups.at(0) ?? null
  return {
    heading: currentGroup?.label ?? null,
    sections: (currentGroup?.sections ?? []).map(toJumpSection(dominantAnchorId)),
    otherGroups: rail.groups.filter((group) => group !== currentGroup),
    looseSections: rail.sections.map(toJumpSection(dominantAnchorId)),
  }
}

export const BACK_KEY = "a"
export const NEXT_KEY = "d"
export const WRITE_UP_KEY = "g"
export const WRITE_UP_BLOCK_KEY = "ctrl+g"
const BACK_LABEL = "Back"
const NEXT_LABEL = "Next"

export interface SectionSteps {
  readonly back: NavigatorButton | null
  readonly next: NavigatorButton | null
}

export const NO_SECTION_STEPS: SectionSteps = { back: null, next: null }

const SEGMENT_LABEL = "Segment"

interface RailStop {
  readonly section: NavigatorRailSection
  readonly segmentLabel: string | null
}

const segmentLabelOf = (position: number, segmentCount: number): string =>
  `${SEGMENT_LABEL} (${String(position + 1)}/${String(segmentCount)})`

const railStopsOf = (rail: NavigatorRail): RailStop[] => [
  ...rail.groups.flatMap((group, position) =>
    group.sections.map((section) => ({ section, segmentLabel: segmentLabelOf(position, rail.groups.length) }))),
  ...rail.sections.map((section) => ({ section, segmentLabel: null })),
]

const stopLabelOf = (stop: RailStop, here: RailStop): string =>
  stop.segmentLabel !== here.segmentLabel && stop.segmentLabel !== null ? stop.segmentLabel : stop.section.label

const stepButtonOf = (key: string, prefix: string, here: RailStop, stop: RailStop | undefined, onJump: (anchorId: string) => void): NavigatorButton | null =>
  stop === undefined
    ? null
    : navigatorButtonOf({ key, label: `${prefix}: ${stopLabelOf(stop, here)}`, shortLabel: prefix, onRun: () => { onJump(stop.section.anchorId) } })

export const sectionStepsOf = (rail: NavigatorRail, anchorId: string | null, onJump: (anchorId: string) => void): SectionSteps => {
  const stops = railStopsOf(rail)
  const position = stops.findIndex((stop) => stop.section.anchorId === anchorId)
  if (position === -1) return NO_SECTION_STEPS
  const here = stops[position]
  return {
    back: stepButtonOf(BACK_KEY, BACK_LABEL, here, stops[position - 1], onJump),
    next: stepButtonOf(NEXT_KEY, NEXT_LABEL, here, stops[position + 1], onJump),
  }
}

export const withSectionSteps = (groups: readonly NavigatorGroup[], steps: SectionSteps): NavigatorGroup[] => {
  const stepGroup = [steps.back, steps.next]
    .filter((button): button is NavigatorButton => button !== null)
    .filter((button) => controlOfKey(groups, button.key) === null)
  return stepGroup.length === 0 ? [...groups] : [stepGroup, ...groups]
}
