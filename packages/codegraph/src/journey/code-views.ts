import { codeLinesIn, findSource, rowSpanOf, type HighlightedSource, type LineDecorations } from "@/code/lines"
import { countLabel } from "@/prose/count-label"
import type { ReviewViewContext } from "@/review-view-context"
import type { WaypointPlace } from "@/walkthrough/build"
import type { CodeView, CodeViewKind, FileRow, LineSpan, NodeCodeView } from "@flightplan/configurations"

export interface CodeViewSetting {
  readonly places: readonly WaypointPlace[]
  readonly changedPaths: readonly string[]
}

interface CountedNoun {
  readonly singular: string
  readonly plural: string
}

const HEADINGS: Readonly<Record<CodeViewKind, string>> = {
  declaration: "Declaration",
  data: "Data",
  event: "Event",
  render: "Render",
}

const COUNTED_NOUNS: Readonly<Record<CodeViewKind, CountedNoun | null>> = {
  declaration: null,
  data: { singular: "value", plural: "values" },
  event: { singular: "event", plural: "events" },
  render: { singular: "return", plural: "returns" },
}

const UNCHANGED_NOTE = "Unchanged by this change"
const SPAN_SEPARATOR = ", "
const ID_SEPARATOR = ":"

const spanLabelOf = ([startLine, endLine]: LineSpan): string =>
  startLine === endLine ? String(startLine) : `${String(startLine)} to ${String(endLine)}`

const rangeLabelOf = (spans: readonly LineSpan[]): string => {
  const isOneLine = spans.length === 1 && spans[0][0] === spans[0][1]
  return `${isOneLine ? "Line" : "Lines"} ${spans.map(spanLabelOf).join(SPAN_SEPARATOR)}`
}

const countLabelOf = ({ kind, entryCount }: CodeView): string | null => {
  const noun = COUNTED_NOUNS[kind]
  return noun === null ? null : countLabel(entryCount, noun.singular, noun.plural)
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

const rowsOf = (highlighted: HighlightedSource, view: CodeView, places: readonly WaypointPlace[], decorations: LineDecorations): FileRow[] =>
  view.lines.flatMap((span, position) => [
    ...gapRowsBefore(view.lines, position),
    ...waypointRowsOf(places, view.lines, position),
    ...linesRowsOf(highlighted, span, decorations),
  ])

const toNodeCodeView = (
  nodeId: string,
  view: CodeView,
  position: number,
  { places, changedPaths }: CodeViewSetting,
  context: ReviewViewContext,
): NodeCodeView[] => {
  const highlighted = findSource(context.sources, view.path)
  if (highlighted === null || view.lines.length === 0) return []
  const decorations: LineDecorations = { marks: view.marks, shownLines: view.lines, definitionIds: context.definitionIds }
  const lineNumbers = view.lines.flat()
  return [
    {
      id: [nodeId, view.kind, position].join(ID_SEPARATOR),
      heading: HEADINGS[view.kind],
      countLabel: countLabelOf(view),
      pathLabel: view.path,
      rangeLabel: rangeLabelOf(view.lines),
      rows: rowsOf(highlighted, view, places.filter((place) => place.path === view.path), decorations),
      note: changedPaths.includes(view.path) ? null : UNCHANGED_NOTE,
      forgeLink: context.blobLinkOf(view.path, { lineStart: Math.min(...lineNumbers), lineEnd: Math.max(...lineNumbers) }),
    },
  ]
}

export const buildNodeCodeViews = (
  nodeId: string,
  views: readonly CodeView[],
  setting: CodeViewSetting,
  context: ReviewViewContext,
): NodeCodeView[] => views.flatMap((view, position) => toNodeCodeView(nodeId, view, position, setting, context))
