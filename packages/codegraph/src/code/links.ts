import { countLabel } from "@/prose/count-label"
import type { BlobLinker } from "@/review-view-context"
import type { Finding, JourneyNode, LineRange, Segment, Waypoint, CodeLink } from "@flightplan/configurations"
import { codeLinesIn, findSource, rowSpanOf, type HighlightedSource, type RowSpan } from "./lines"

const CODE_LINK_PATTERN = /\]\(code:([^)\s]+)\)/g
const LINES_TARGET_PATTERN = /^L\d+(?:-\d+)?$/
const LINES_PREFIX = "L"
const LINES_SEPARATOR = "-"
const TARGET_SEPARATOR = "#"
const EXCERPT_CONTEXT_ROWS = 2
const DECIMAL = 10

export const codeLinkIdOf = (path: string, target: string): string => `${path}${TARGET_SEPARATOR}${target}`

export const codeLinkIdsIn = (texts: readonly string[]): string[] => [
  ...new Set(texts.flatMap((text) => [...text.matchAll(CODE_LINK_PATTERN)].map((match) => match[1]))),
]

export interface ResolvedCodeTarget {
  readonly highlighted: HighlightedSource
  readonly range: LineRange
  readonly span: RowSpan
}

const linesRangeOf = (target: string): LineRange | null => {
  if (!LINES_TARGET_PATTERN.test(target)) return null
  const numbers = target
    .slice(LINES_PREFIX.length)
    .split(LINES_SEPARATOR)
    .map((digits) => Number.parseInt(digits, DECIMAL))
  return { lineStart: Math.min(...numbers), lineEnd: Math.max(...numbers) }
}

export const resolveCodeTarget = (sources: readonly HighlightedSource[], linkId: string): ResolvedCodeTarget | null => {
  const separatorIndex = linkId.lastIndexOf(TARGET_SEPARATOR)
  const highlighted = findSource(sources, linkId.slice(0, separatorIndex))
  if (highlighted === null) return null
  const target = linkId.slice(separatorIndex + 1)
  const range = Object.keys(highlighted.source.declarations).includes(target)
    ? highlighted.source.declarations[target]
    : linesRangeOf(target)
  const span = range === null ? null : rowSpanOf(highlighted.source, range)
  return range === null || span === null ? null : { highlighted, range, span }
}

const excerptSpanOf = (resolved: ResolvedCodeTarget): RowSpan => ({
  start: Math.max(0, resolved.span.start - EXCERPT_CONTEXT_ROWS),
  end: Math.min(resolved.highlighted.source.lines.length - 1, resolved.span.end + EXCERPT_CONTEXT_ROWS),
})

export const rangeLabelOf = (range: LineRange): string =>
  range.lineStart === range.lineEnd
    ? `Line ${String(range.lineStart)}`
    : `Lines ${String(range.lineStart)} to ${String(range.lineEnd)}, ${countLabel(range.lineEnd - range.lineStart + 1, "line", "lines")}`

export const buildCodeLink = (
  resolved: ResolvedCodeTarget,
  anchorId: string | null,
  blobLinkOf: BlobLinker,
): CodeLink => ({
  pathLabel: resolved.highlighted.source.path,
  rangeLabel: rangeLabelOf(resolved.range),
  lines: codeLinesIn(resolved.highlighted, excerptSpanOf(resolved), resolved.span),
  anchorId,
  forgeLink: blobLinkOf(resolved.highlighted.source.path, resolved.range),
})

const findingTexts = (finding: Finding): string[] => [finding.title, finding.reading, ...(finding.trace ?? [])]

const waypointTexts = (waypoint: Waypoint): string[] => [
  waypoint.reading,
  waypoint.needsAttention ?? "",
  ...waypoint.findings.flatMap(findingTexts),
  ...waypoint.children.flatMap(waypointTexts),
]

const journeyNodeTexts = (node: JourneyNode): string[] => [
  node.description ?? "",
  ...(node.kind === "declaration" ? node.returns.map((componentReturn) => componentReturn.description ?? "") : []),
]

const segmentTexts = (segment: Segment): string[] => [
  segment.context,
  ...(segment.journey?.nodes ?? []).flatMap(journeyNodeTexts),
  ...(segment.blast?.nodes ?? []).flatMap((node) => [node.contract?.before ?? "", node.contract?.now ?? "", node.effect ?? ""]),
  segment.walkthrough.intro ?? "",
  ...segment.walkthrough.files.flatMap((file) => [...file.summary, ...file.waypoints.flatMap(waypointTexts)]),
]

const waypointLinkIds = (path: string, waypoint: Waypoint): string[] => [
  codeLinkIdOf(path, waypoint.declaration),
  ...waypoint.children.flatMap((child) => waypointLinkIds(path, child)),
]

const declaredLinkIds = (segment: Segment): string[] => [
  ...(segment.journey?.nodes.flatMap((node) => (node.kind === "declaration" ? [codeLinkIdOf(node.path, node.declaration)] : [])) ?? []),
  ...(segment.blast?.nodes ?? []).map((node) => codeLinkIdOf(node.path, node.declaration)),
  ...segment.walkthrough.files.flatMap((file) => file.waypoints.flatMap((waypoint) => waypointLinkIds(file.path, waypoint))),
]

export const collectCodeLinkIds = (segments: readonly Segment[]): string[] => [
  ...new Set([
    ...codeLinkIdsIn(segments.flatMap(segmentTexts)),
    ...segments.flatMap(declaredLinkIds),
  ]),
]

export const waypointIdByLinkId = (segments: readonly Segment[]): ReadonlyMap<string, string> => {
  const entriesOf = (path: string, waypoint: Waypoint): (readonly [string, string])[] => [
    [codeLinkIdOf(path, waypoint.declaration), waypoint.id],
    ...waypoint.children.flatMap((child) => entriesOf(path, child)),
  ]
  return new Map(
    segments.flatMap((segment) =>
      segment.walkthrough.files.flatMap((file) => file.waypoints.flatMap((waypoint) => entriesOf(file.path, waypoint)))),
  )
}
