import type { Segment } from "@flightplan/configurations"
import { refuse, type SegmentsOutcome } from "./refusal"
import type { SegmentEdit } from "./schemas"

const NO_DIAGRAM_MESSAGE = "This segment has no Trace Diagram to title or describe."

const describedTrace = ({ traceDiagram }: Segment, edit: SegmentEdit): Segment["traceDiagram"] =>
  traceDiagram === null
    ? traceDiagram
    : { ...traceDiagram, title: edit.traceDiagramTitle ?? traceDiagram.title, description: edit.traceDiagramDescription ?? traceDiagram.description }

const isTraceEdited = (edit: SegmentEdit): boolean => edit.traceDiagramTitle !== undefined || edit.traceDiagramDescription !== undefined

const amendSegment = (segment: Segment, edit: SegmentEdit): Segment => ({
  ...segment,
  title: edit.title ?? segment.title,
  context: edit.context ?? segment.context,
  traceDiagram: describedTrace(segment, edit),
})

export const segmentTextsOf = (edit: SegmentEdit): string[] => [edit.context ?? "", edit.traceDiagramDescription ?? ""]

export const countSegmentEdits = (edit: SegmentEdit): number =>
  [edit.title, edit.context, edit.traceDiagramTitle, edit.traceDiagramDescription].filter((written) => written !== undefined).length

export const amendSegments = (segments: readonly Segment[], edit: SegmentEdit): SegmentsOutcome =>
  isTraceEdited(edit) && segments.some((segment) => segment.traceDiagram === null)
    ? refuse(NO_DIAGRAM_MESSAGE)
    : { kind: "amended", segments: segments.map((segment) => amendSegment(segment, edit)) }
