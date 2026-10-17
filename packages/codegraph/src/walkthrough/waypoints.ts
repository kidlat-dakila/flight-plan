import { createHash } from "node:crypto"
import { rowSpanOf, isInSpan } from "@/code/lines"
import { countLabel } from "@/prose/count-label"
import { parseInlines, parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import type { ReviewedMarks } from "@/walkthrough/reviewed-marks"
import { rootBlockKeysOf, rootBlocksOf, type RootBlockKey } from "@/walkthrough/root-blocks"
import {
  FINDING_KINDS,
  WAYPOINT_MARK_KINDS,
  type CodeBlock,
  type CodeLine,
  type FileSection,
  type Finding,
  type FindingView,
  type SourceFile,
  type SourceLine,
  type TokenLine,
  type Waypoint,
  type WaypointChange,
} from "@flightplan/configurations"

export interface FlatWaypoint {
  readonly waypoint: Waypoint
  readonly depth: number
  readonly path: string
  readonly fingerprint: string
  readonly change: WaypointChange | null
  readonly rootBlocks: readonly CodeBlock[]
  readonly rootBlockKeys: readonly RootBlockKey[]
}

const DELETED_BLOCK_TYPE: CodeBlock["type"] = "deleted"

const fingerprintOf = (content: unknown): string => createHash("sha1").update(JSON.stringify(content)).digest("hex")

const waypointRowsOf = (source: SourceFile | null, waypoint: Waypoint): SourceLine[] => {
  const range = source?.declarations[waypoint.declaration]
  const span = source === null || range === undefined ? null : rowSpanOf(source, range)
  return (source?.lines ?? []).filter((_line, index) => isInSpan(index, span))
}

const waypointFingerprint = (waypoint: Waypoint, rows: readonly SourceLine[]): string =>
  fingerprintOf({
    title: waypoint.title,
    reading: waypoint.reading,
    needsAttention: waypoint.needsAttention,
    findings: waypoint.findings,
    rows: rows.map((line) => `${line.mark}${line.text}`),
  })

const isDeletedBlock = (block: CodeBlock): boolean => block.type === DELETED_BLOCK_TYPE

export const waypointChangeOf = (waypoint: Waypoint, rows: readonly SourceLine[]): WaypointChange | null => {
  if (waypoint.codeBlocks.length > 0 && waypoint.codeBlocks.every(isDeletedBlock)) return "removed"
  if (rows.length > 0 && rows.every((line) => line.mark === "added")) return "added"
  return rows.some((line) => line.mark !== "context") ? "modified" : null
}

interface Flattening {
  readonly source: SourceFile | null
  readonly path: string
  readonly depth: number
  readonly heldRootBlocks: readonly CodeBlock[]
}

const flattenWaypoint = (waypoint: Waypoint, { source, path, depth, heldRootBlocks }: Flattening): FlatWaypoint[] => {
  const rows = waypointRowsOf(source, waypoint)
  const ownRootBlocks = rootBlocksOf(waypoint)
  const rootBlocks = ownRootBlocks.length === 0 ? heldRootBlocks : ownRootBlocks
  return [
    {
      waypoint,
      depth,
      path,
      fingerprint: waypointFingerprint(waypoint, rows),
      change: waypointChangeOf(waypoint, rows),
      rootBlocks,
      rootBlockKeys: rootBlockKeysOf(rootBlocks, source),
    },
    ...waypoint.children.flatMap((child) => flattenWaypoint(child, { source, path, depth: depth + 1, heldRootBlocks: rootBlocks })),
  ]
}

export const flattenWaypoints = (file: FileSection, source: SourceFile | null): FlatWaypoint[] =>
  file.waypoints.flatMap((waypoint) => flattenWaypoint(waypoint, { source, path: file.path, depth: 0, heldRootBlocks: [] }))

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

type WaypointMarkKind = (typeof WAYPOINT_MARK_KINDS)[number]

const WAYPOINT_MARK_LABELS: Readonly<Record<WaypointMarkKind, string>> = {
  ...FINDING_KIND_LABELS,
  attention: ATTENTION_LABEL,
  plain: "",
}

const markKindsOf = (waypoint: Waypoint): ReadonlySet<WaypointMarkKind> =>
  new Set([...waypoint.findings.map((finding) => finding.kind), ...(waypoint.needsAttention === null ? [] : ["attention" as const])])

export const markKindOf = (waypoint: Waypoint): WaypointMarkKind => {
  const kinds = markKindsOf(waypoint)
  return WAYPOINT_MARK_KINDS.find((kind) => kinds.has(kind)) ?? "plain"
}

export const markLabelOf = (kind: WaypointMarkKind, positionLabel: string, title: string): string =>
  kind === "plain"
    ? `Waypoint ${positionLabel}: ${title}`
    : `${WAYPOINT_MARK_LABELS[kind]} waypoint ${positionLabel}: ${title}`

const COUNTED_MARK_KINDS = ["bug", "risk", "attention", "question", "nit"] as const satisfies readonly WaypointMarkKind[]

type CountedMarkKind = (typeof COUNTED_MARK_KINDS)[number]

const COUNT_NOUNS: Readonly<Record<CountedMarkKind, readonly [singular: string, plural: string]>> = {
  bug: ["bug", "bugs"],
  risk: ["risk", "risks"],
  attention: ["needs attention", "need attention"],
  question: ["question", "questions"],
  nit: ["nit", "nits"],
}

const markCountOf = (waypoints: readonly FlatWaypoint[], kind: CountedMarkKind): number =>
  kind === "attention"
    ? waypoints.filter(({ waypoint }) => waypoint.needsAttention !== null).length
    : waypoints.flatMap(({ waypoint }) => waypoint.findings).filter((finding) => finding.kind === kind).length

export const countLabelsOf = (waypoints: readonly FlatWaypoint[]): string[] => [
  countLabel(waypoints.length, "waypoint", "waypoints"),
  ...COUNTED_MARK_KINDS.flatMap((kind) => {
    const count = markCountOf(waypoints, kind)
    const [singular, plural] = COUNT_NOUNS[kind]
    return count === 0 ? [] : [countLabel(count, singular, plural)]
  }),
]

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
