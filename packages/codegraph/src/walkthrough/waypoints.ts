import { createHash } from "node:crypto"
import { rowSpanOf, isInSpan } from "@/code/lines"
import { countLabel } from "@/prose/count-label"
import { parseInlines, parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import type { ReviewedMarks } from "@/walkthrough/reviewed-marks"
import {
  FINDING_KINDS,
  WAYPOINT_FILTER_KEYS,
  type CodeLine,
  type FileSection,
  type Finding,
  type FindingView,
  type SourceFile,
  type SourceLine,
  type TokenLine,
  type Waypoint,
  type WaypointFilter,
  type WaypointFilterKey,
} from "@flightplan/configurations"

export interface FlatWaypoint {
  readonly waypoint: Waypoint
  readonly depth: number
  readonly path: string
  readonly fingerprint: string
}

const fingerprintOf = (content: unknown): string => createHash("sha1").update(JSON.stringify(content)).digest("hex")

const waypointRowTexts = (source: SourceFile | null, waypoint: Waypoint): string[] => {
  const range = source?.declarations[waypoint.declaration]
  const span = source === null || range === undefined ? null : rowSpanOf(source, range)
  return (source?.lines ?? []).filter((_line, index) => isInSpan(index, span)).map((line) => `${line.mark}${line.text}`)
}

const waypointFingerprint = (source: SourceFile | null, waypoint: Waypoint): string =>
  fingerprintOf({
    title: waypoint.title,
    reading: waypoint.reading,
    needsAttention: waypoint.needsAttention,
    findings: waypoint.findings,
    rows: waypointRowTexts(source, waypoint),
  })

const flattenWaypoint = (source: SourceFile | null, path: string, waypoint: Waypoint, depth: number): FlatWaypoint[] => [
  { waypoint, depth, path, fingerprint: waypointFingerprint(source, waypoint) },
  ...waypoint.children.flatMap((child) => flattenWaypoint(source, path, child, depth + 1)),
]

export const flattenWaypoints = (file: FileSection, source: SourceFile | null): FlatWaypoint[] =>
  file.waypoints.flatMap((waypoint) => flattenWaypoint(source, file.path, waypoint, 0))

export const fileFingerprint = (waypoints: readonly FlatWaypoint[]): string =>
  fingerprintOf(waypoints.map((flat) => flat.fingerprint))

export const isWaypointReviewed = (marks: ReviewedMarks, flat: FlatWaypoint): boolean =>
  marks.waypoints[flat.waypoint.id] === flat.fingerprint

export const isFileReviewed = (marks: ReviewedMarks, path: string, waypoints: readonly FlatWaypoint[]): boolean =>
  marks.files[path] === fileFingerprint(waypoints)
  || (waypoints.length > 0 && waypoints.every((flat) => isWaypointReviewed(marks, flat)))

export const descendantsOf = (waypoints: readonly FlatWaypoint[], waypointId: string): FlatWaypoint[] => {
  const root = waypoints.find((flat) => flat.waypoint.id === waypointId)
  if (root === undefined) return []
  const followers = waypoints.slice(waypoints.indexOf(root) + 1)
  const end = followers.findIndex((flat) => flat.depth <= root.depth)
  return [root, ...(end < 0 ? followers : followers.slice(0, end))]
}

export const FINDING_KIND_LABELS: Readonly<Record<(typeof FINDING_KINDS)[number], string>> = {
  bug: "Bug",
  risk: "Risk",
  nit: "Nit",
  question: "Question",
}

export const ATTENTION_LABEL = "Needs Attention"

const FILTER_LABELS: Readonly<Record<WaypointFilterKey, string>> = {
  attention: ATTENTION_LABEL,
  ...FINDING_KIND_LABELS,
}

const isFilterKey = (key: string): key is WaypointFilterKey =>
  WAYPOINT_FILTER_KEYS.some((filterKey) => filterKey === key)

export const selectFilterKeys = (requested: readonly string[] | null): WaypointFilterKey[] =>
  WAYPOINT_FILTER_KEYS.filter((key) => (requested ?? []).filter(isFilterKey).includes(key))

const matchesKey = ({ waypoint }: FlatWaypoint, key: WaypointFilterKey): boolean =>
  key === "attention" ? waypoint.needsAttention !== null : waypoint.findings.some((finding) => finding.kind === key)

export const matchesFilter = (flat: FlatWaypoint, selected: readonly WaypointFilterKey[]): boolean =>
  selected.length === 0 || selected.some((key) => matchesKey(flat, key))

const toggledKeys = (selected: readonly WaypointFilterKey[], key: WaypointFilterKey): WaypointFilterKey[] =>
  WAYPOINT_FILTER_KEYS.filter((candidate) => (candidate === key) !== selected.includes(candidate))

const FILTER_BUTTON_LABEL = "Filter"
const FILTER_HEADING = "Show waypoints with"
const FILTER_HINT = "No kind ticked shows every kind. Reviewed waypoints stay hidden until ticked."
const REVIEWED_VALUE_LABEL = "Reviewed"

const kindsValueLabel = (selected: readonly WaypointFilterKey[]): string | null => {
  if (selected.length > 1) return `${String(selected.length)} kinds`
  return selected.length === 0 ? null : FILTER_LABELS[selected[0]]
}

const filterValueLabel = (selected: readonly WaypointFilterKey[], isShowingReviewed: boolean): string | null => {
  const parts = [kindsValueLabel(selected), isShowingReviewed ? REVIEWED_VALUE_LABEL : null].filter((part) => part !== null)
  return parts.length === 0 ? null : parts.join(" + ")
}

export const buildWaypointFilter = (
  waypoints: readonly FlatWaypoint[],
  selected: readonly WaypointFilterKey[],
  isShowingReviewed: boolean,
): WaypointFilter => ({
  buttonLabel: FILTER_BUTTON_LABEL,
  valueLabel: filterValueLabel(selected, isShowingReviewed),
  heading: FILTER_HEADING,
  hint: FILTER_HINT,
  options: WAYPOINT_FILTER_KEYS.map((key) => ({
    key,
    label: FILTER_LABELS[key],
    countLabel: countLabel(waypoints.filter((flat) => matchesKey(flat, key)).length, "waypoint", "waypoints"),
    isSelected: selected.includes(key),
    toggledKeys: toggledKeys(selected, key),
  })),
})

export interface ReplacedRow {
  readonly line: SourceLine
  readonly tokens: TokenLine
}

const toRemovedLine = ({ line, tokens }: ReplacedRow): CodeLine => ({
  numberLabel: line.number === null ? "" : String(line.number),
  removedNumberLabel: "",
  mark: "removed",
  isFocused: false,
  tokens: [...tokens],
  marks: [],
  references: [],
})

const toAddedLine = (tokens: TokenLine): CodeLine => ({
  numberLabel: "",
  removedNumberLabel: "",
  mark: "added",
  isFocused: false,
  tokens: [...tokens],
  marks: [],
  references: [],
})

const solutionLines = (finding: Finding, replacedRows: readonly ReplacedRow[], context: ReviewViewContext): CodeLine[] => [
  ...replacedRows.map(toRemovedLine),
  ...(context.solutionTokens.get(finding.id) ?? []).map(toAddedLine),
]

export const buildFinding = (
  finding: Finding,
  replacedRows: readonly ReplacedRow[],
  context: ReviewViewContext,
): FindingView => ({
  id: finding.id,
  kind: finding.kind,
  kindLabel: FINDING_KIND_LABELS[finding.kind],
  title: parseInlines(finding.title, context.knownLinkIds),
  reading: parseProse(finding.reading, context.knownLinkIds),
  traceLabel: "Trace",
  trace: finding.trace?.map((step) => parseInlines(step, context.knownLinkIds)) ?? null,
  solution: finding.solution === null
    ? null
    : {
        showLabel: "Preview the fix",
        hideLabel: "Hide the fix",
        lines: solutionLines(finding, replacedRows, context),
      },
})

export const mostSevereKind = (findings: readonly Finding[]): Finding["kind"] | null =>
  FINDING_KINDS.find((kind) => findings.some((finding) => finding.kind === kind)) ?? null
