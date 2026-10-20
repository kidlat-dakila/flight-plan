import type { Segment } from "@flightplan/configurations"
import { refuse, type SegmentsOutcome } from "./refusal"
import type { SegmentEdit } from "./schemas"

const NO_DIAGRAM_MESSAGE = "This segment has no Trace Diagram to describe."

const describedTrace = ({ traceDiagram }: Segment, description: string | undefined): Segment["traceDiagram"] =>
  traceDiagram === null || description === undefined ? traceDiagram : { ...traceDiagram, description }

const amendSegment = (segment: Segment, edit: SegmentEdit): Segment => ({
  ...segment,
  title: edit.title ?? segment.title,
  context: edit.context ?? segment.context,
  traceDiagram: describedTrace(segment, edit.traceDiagramDescription),
})

export const segmentTextsOf = (edit: SegmentEdit): string[] => [edit.context ?? "", edit.traceDiagramDescription ?? ""]

export const countSegmentEdits = (edit: SegmentEdit): number =>
  [edit.title, edit.context, edit.traceDiagramDescription].filter((written) => written !== undefined).length

export const amendSegments = (segments: readonly Segment[], edit: SegmentEdit): SegmentsOutcome =>
  edit.traceDiagramDescription !== undefined && segments.some((segment) => segment.traceDiagram === null)
    ? refuse(NO_DIAGRAM_MESSAGE)
    : { kind: "amended", segments: segments.map((segment) => amendSegment(segment, edit)) }
