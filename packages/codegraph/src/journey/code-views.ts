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

const waypointRowsOf = (places: readonly WaypointPlace[], spans: readonly LineSpan[], position: number): FileRow[] =>
  places
    .filter((place) => overlaps(spans[position], place) && spans.slice(0, position).every((earlier) => !overlaps(earlier, place)))
    .map((place) => ({ kind: "waypoint", id: `waypoint-${place.view.id}`, waypoint: place.view }))

const gapRowsBefore = (spans: readonly LineSpan[], position: number): FileRow[] => {
  if (position === 0) return []
  const hiddenCount = spans[position][0] - spans[position - 1][1] - 1
  return hiddenCount <= 0 ? [] : [{ kind: "gap", id: `gap-${String(position)}`, label: countLabel(hiddenCount, "line hidden", "lines hidden") }]
}

const linesRowsOf = (highlighted: HighlightedSource, [lineStart, lineEnd]: LineSpan, decorations: LineDecorations): FileRow[] => {
  const span = rowSpanOf(highlighted.source, { lineStart, lineEnd })
  return span === null ? [] : [{ kind: "lines", id: `lines-${String(lineStart)}`, lines: codeLinesIn(highlighted, span, null, decorations) }]
}

const rowsOf = (highlighted: HighlightedSource, spans: readonly LineSpan[], places: readonly WaypointPlace[], decorations: LineDecorations): FileRow[] =>
  spans.flatMap((span, position) => [
    ...gapRowsBefore(spans, position),
    ...waypointRowsOf(places, spans, position),
    ...linesRowsOf(highlighted, span, decorations),
  ])

export const buildNodeCodeViews = (nodeId: string, { path, lines }: ViewedCode, { places, changedPaths }: CodeViewSetting, context: ReviewViewContext): NodeCodeView[] => {
  const highlighted = findSource(context.sources, path)
  if (highlighted === null || lines.length === 0) return []
  const decorations: LineDecorations = { marks: [], shownLines: lines, definitionIds: context.definitionIds }
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
