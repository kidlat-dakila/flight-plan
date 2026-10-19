import {
  ARRANGED_SECTIONS,
  type ArrangedSection,
  type ReviewPreferences,
} from "@/procedures/get-review-preferences/utils/review-preferences"
import { CODE_BLOCK_CLASSIFICATIONS, type CodeBlockClassification } from "@flightplan/configurations"

export interface PreferencesRejection {
  readonly kind: "rejected"
  readonly message: string
  readonly field: { readonly owner: string, readonly name: string }
}

export type PreferencesPlan
  = | { readonly kind: "accepted", readonly preferences: ReviewPreferences }
    | PreferencesRejection

const IGNORED_PATHS_FIELD = "ignoredPaths"
const SECTION_ORDER_FIELD = "sectionOrder"
const EMPTY_PATTERN_MESSAGE = "Write a path pattern, or remove this row."
const ABSOLUTE_PATTERN_MESSAGE = "Write the pattern from the root of the repository, without a leading slash."
const BACKSLASH_PATTERN_MESSAGE = "Use forward slashes in path patterns."
const REPEATED_PATTERN_MESSAGE = "This pattern is already in the list."
const SECTION_ORDER_MESSAGE = "Place each section once."

const patternProblemOf = (pattern: string, earlierPatterns: readonly string[]): string | null => {
  if (pattern === "") return EMPTY_PATTERN_MESSAGE
  if (pattern.startsWith("/")) return ABSOLUTE_PATTERN_MESSAGE
  if (pattern.includes("\\")) return BACKSLASH_PATTERN_MESSAGE
  return earlierPatterns.includes(pattern) ? REPEATED_PATTERN_MESSAGE : null
}

const findPatternRejection = (patterns: readonly string[]): PreferencesRejection | null => {
  const problems = patterns.map((pattern, position) => patternProblemOf(pattern, patterns.slice(0, position)))
  const position = problems.findIndex((problem) => problem !== null)
  const message = problems[position] ?? null
  return message === null ? null : { kind: "rejected", message, field: { owner: IGNORED_PATHS_FIELD, name: String(position) } }
}

const isEverySectionPlacedOnce = (sectionOrder: readonly ArrangedSection[]): boolean =>
  sectionOrder.length === ARRANGED_SECTIONS.length && ARRANGED_SECTIONS.every((section) => sectionOrder.includes(section))

const inHierarchyOrder = (spotlight: readonly CodeBlockClassification[]): readonly CodeBlockClassification[] =>
  CODE_BLOCK_CLASSIFICATIONS.filter((classification) => spotlight.includes(classification))

export const planPreferencesSaving = (wanted: ReviewPreferences): PreferencesPlan => {
  const ignoredPaths = wanted.ignoredPaths.map((pattern) => pattern.trim())
  const patternRejection = findPatternRejection(ignoredPaths)
  if (patternRejection !== null) return patternRejection
  if (!isEverySectionPlacedOnce(wanted.sectionOrder)) {
    return { kind: "rejected", message: SECTION_ORDER_MESSAGE, field: { owner: SECTION_ORDER_FIELD, name: "" } }
  }
  return { kind: "accepted", preferences: { ...wanted, spotlight: inHierarchyOrder(wanted.spotlight), ignoredPaths } }
}
