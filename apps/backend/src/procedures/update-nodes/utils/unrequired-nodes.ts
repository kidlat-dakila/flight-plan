import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { listTraceNodes } from "@flightplan/codegraph"
import type { Segment } from "@flightplan/configurations"
import type { BlastEdit, SegmentEdit, TraceEdit, WaypointEdit } from "./schemas"

export interface RequestedEdits {
  readonly segment: SegmentEdit
  readonly waypoints: readonly WaypointEdit[]
  readonly traceDiagram: readonly TraceEdit[]
  readonly blastDiagram: readonly BlastEdit[]
}

const CONTEXT_NODE = "the context and the title"
const TRACE_DESCRIPTION_NODE = "the Trace Diagram title and description"

const quotedId = (id: string): string => `\`${id}\``

const isWritten = (field: unknown): boolean => field !== undefined

const unrequiredContextOf = (segment: Segment, edit: SegmentEdit): string[] =>
  !segment.isContextRequired && (isWritten(edit.title) || isWritten(edit.context)) ? [CONTEXT_NODE] : []

const unrequiredDescriptionOf = (segment: Segment, edit: SegmentEdit): string[] =>
  (isWritten(edit.traceDiagramTitle) || isWritten(edit.traceDiagramDescription)) && segment.traceDiagram !== null && !segment.traceDiagram.isRequired ? [TRACE_DESCRIPTION_NODE] : []

const unrequiredWaypointIdsOf = (segment: Segment, edits: readonly WaypointEdit[]): string[] => {
  const unrequiredIds = new Set(waypointsOf(segment).filter(({ waypoint }) => !waypoint.isRequired).map(({ waypoint }) => waypoint.id))
  return edits.map((edit) => edit.id).filter((id) => unrequiredIds.has(id)).map(quotedId)
}

const unrequiredTraceNodeIdsOf = (segment: Segment, edits: readonly TraceEdit[]): string[] => {
  const unrequiredIds = new Set(listTraceNodes(segment.traceDiagram?.traceNodes ?? []).filter((node) => !node.isRequired).map((node) => node.id))
  return edits.map((edit) => edit.id).filter((id) => unrequiredIds.has(id)).map(quotedId)
}

const unrequiredBlastPathsOf = (segment: Segment, edits: readonly BlastEdit[]): string[] => {
  const unrequiredPaths = new Set((segment.blastDiagram?.nodes ?? []).filter((node) => !node.isRequired).map((node) => node.path))
  return edits.map((edit) => edit.path).filter((path) => unrequiredPaths.has(path)).map(quotedId)
}

const unrequiredNodesIn = (segment: Segment, edits: RequestedEdits): string[] => [
  ...unrequiredContextOf(segment, edits.segment),
  ...unrequiredDescriptionOf(segment, edits.segment),
  ...unrequiredWaypointIdsOf(segment, edits.waypoints),
  ...unrequiredTraceNodeIdsOf(segment, edits.traceDiagram),
  ...unrequiredBlastPathsOf(segment, edits.blastDiagram),
]

export const unrequiredProblemOf = (segments: readonly Segment[], edits: RequestedEdits): string | null => {
  const names = segments.flatMap((segment) => unrequiredNodesIn(segment, edits))
  return names.length > 0 ? `This review does not ask you to write ${[...new Set(names)].join(", ")}. Leave it as it is.` : null
}
