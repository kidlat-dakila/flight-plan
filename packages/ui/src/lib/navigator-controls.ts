import type { ReactNode } from "react"

export interface NavigatorButton {
  readonly kind: "button"
  readonly key: string
  readonly label: string
  readonly description: string | null
  readonly isPressed: boolean
  readonly isPrimary: boolean
  readonly isDisabled: boolean
  readonly onRun: () => void
}

export interface NavigatorChoice {
  readonly id: string
  readonly label: string
  readonly countLabel: string
  readonly marker: ReactNode
  readonly isChecked: boolean
  readonly isDisabled: boolean
  readonly onToggle: () => void
}

export interface NavigatorMenu {
  readonly kind: "menu"
  readonly key: string
  readonly label: string
  readonly valueLabel: string | null
  readonly heading: string
  readonly hint: string
  readonly choiceGroups: readonly (readonly NavigatorChoice[])[]
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
  readonly description?: string | null
  readonly isPressed?: boolean
  readonly isPrimary?: boolean
  readonly isDisabled?: boolean
  readonly onRun: () => void
}

export const navigatorButtonOf = ({ key, label, description = null, isPressed = false, isPrimary = false, isDisabled = false, onRun }: ButtonRequest): NavigatorButton => ({
  kind: "button",
  key,
  label,
  description,
  isPressed,
  isPrimary,
  isDisabled,
  onRun,
})

const choiceSignatureOf = (choice: NavigatorChoice): string => [choice.id, choice.label, choice.countLabel, choice.isChecked, choice.isDisabled].join("|")

const controlSignatureOf = (control: NavigatorControl): string => {
  if (control.kind === "position") return `position|${control.label}`
  if (control.kind === "button") {
    return ["button", control.key, control.label, control.description, control.isPressed, control.isPrimary, control.isDisabled].join("|")
  }
  return ["menu", control.key, control.label, control.valueLabel, control.heading, control.hint, ...control.choiceGroups.flat().map(choiceSignatureOf)].join("|")
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
