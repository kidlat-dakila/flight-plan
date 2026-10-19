import { codeLinesIn, findSource, rowSpanOf, type HighlightedSource, type LineDecorations } from "@/code/lines"
import { countLabel } from "@/prose/count-label"
import type { ReviewViewContext } from "@/review-view-context"
import type { WaypointPlace } from "@/walkthrough/build"
import type { FileRow, LineSpan, NodeCodeView } from "@flightplan/configurations"

export interface CodeViewSetting {
  readonly places: readonly WaypointPlace[]
  readonly changedPaths: readonly string[]
}

export interface ViewedCode {
  readonly path: string
  readonly lines: readonly LineSpan[]
}

const HEADING = "Code"
const UNCHANGED_NOTE = "Unchanged by this change"
const SPAN_SEPARATOR = ", "
const ID_SEPARATOR = ":"

const spanLabelOf = ([startLine, endLine]: LineSpan): string =>
  startLine === endLine ? String(startLine) : `${String(startLine)} to ${String(endLine)}`

const rangeLabelOf = (spans: readonly LineSpan[]): string => {
  const isOneLine = spans.length === 1 && spans[0][0] === spans[0][1]
  return `${isOneLine ? "Line" : "Lines"} ${spans.map(spanLabelOf).join(SPAN_SEPARATOR)}`
}

const overlaps = ([startLine, endLine]: LineSpan, { range }: WaypointPlace): boolean =>
  range.lineStart <= endLine && startLine <= range.lineEnd

interface WaypointAnchor {
  readonly place: WaypointPlace
  readonly line: number
}

const anchorsIn = (places: readonly WaypointPlace[], spans: readonly LineSpan[], position: number): WaypointAnchor[] =>
  places
    .filter((place) => overlaps(spans[position], place) && spans.slice(0, position).every((earlier) => !overlaps(earlier, place)))
    .map((place) => ({ place, line: Math.max(place.range.lineStart, spans[position][0]) }))

const waypointRowsAt = (anchors: readonly WaypointAnchor[], line: number): FileRow[] =>
  anchors
    .filter((anchor) => anchor.line === line)
    .map(({ place }) => ({ kind: "waypoint", id: `waypoint-${place.view.id}`, waypoint: place.view, rootBlockId: null }))

const partsOf = ([lineStart, lineEnd]: LineSpan, anchors: readonly WaypointAnchor[]): LineSpan[] => {
  const partStarts = [...new Set([lineStart, ...anchors.map((anchor) => anchor.line)])].sort((earlier, later) => earlier - later)
  return partStarts.map((partStart, index) => [partStart, index + 1 < partStarts.length ? partStarts[index + 1] - 1 : lineEnd])
}

const gapRowsBefore = (spans: readonly LineSpan[], position: number): FileRow[] => {
  if (position === 0) return []
  const hiddenCount = spans[position][0] - spans[position - 1][1] - 1
  return hiddenCount <= 0 ? [] : [{ kind: "gap", id: `gap-${String(position)}`, label: countLabel(hiddenCount, "line hidden", "lines hidden"), rootBlockId: null }]
}

const linesRowsOf = (highlighted: HighlightedSource, [lineStart, lineEnd]: LineSpan, decorations: LineDecorations): FileRow[] => {
  const span = rowSpanOf(highlighted.source, { lineStart, lineEnd })
  return span === null ? [] : [{ kind: "lines", id: `lines-${String(lineStart)}`, lines: codeLinesIn(highlighted, span, null, decorations), collapses: [] }]
}

const rowsOf = (highlighted: HighlightedSource, spans: readonly LineSpan[], places: readonly WaypointPlace[], decorations: LineDecorations): FileRow[] =>
  spans.flatMap((span, position) => {
    const anchors = anchorsIn(places, spans, position)
    return [
      ...gapRowsBefore(spans, position),
      ...partsOf(span, anchors).flatMap((part) => [...waypointRowsAt(anchors, part[0]), ...linesRowsOf(highlighted, part, decorations)]),
    ]
  })

export const buildNodeCodeViews = (nodeId: string, { path, lines }: ViewedCode, { places, changedPaths }: CodeViewSetting, context: ReviewViewContext): NodeCodeView[] => {
  const highlighted = findSource(context.sources, path)
  if (highlighted === null || lines.length === 0) return []
  const decorations: LineDecorations = { marks: [], definitionIds: context.definitionIds }
  const lineNumbers = lines.flat()
  return [
    {
      id: [nodeId, path].join(ID_SEPARATOR),
      heading: HEADING,
      countLabel: null,
      pathLabel: path,
      rangeLabel: rangeLabelOf(lines),
      rows: rowsOf(highlighted, lines, places.filter((place) => place.path === path), decorations),
      note: changedPaths.includes(path) ? null : UNCHANGED_NOTE,
      forgeLink: context.blobLinkOf(path, { lineStart: Math.min(...lineNumbers), lineEnd: Math.max(...lineNumbers) }),
    },
  ]
}
