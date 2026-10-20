import type { ArrangedSection } from "@/procedures/get-review-preferences/utils/review-preferences"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { listReachedPaths, listTraceNodes } from "@flightplan/codegraph"
import type { Segment, TraceNode } from "@flightplan/configurations"

export type WriteUpNotices = Readonly<Record<ArrangedSection, string | null>>

type SectionState = "empty" | "unwritten" | "written"

export const NO_WRITE_UP_LABEL = "No write-up yet"

export const NO_WRITE_UP_NOTICES: WriteUpNotices = { context: null, traceDiagram: null, blastDiagram: null, walkthrough: null }

const stateOf = (hasParts: boolean, isWritten: boolean): SectionState => {
  if (!hasParts) return "empty"
  return isWritten ? "written" : "unwritten"
}

const isTraceNodeWritten = (node: TraceNode): boolean =>
  node.label !== null
  || node.triggerLabels.some((trigger) => trigger.label !== null)
  || node.blockLabels.some((listed) => listed.label !== null)

const traceNodesOf = (segment: Segment): TraceNode[] => listTraceNodes(segment.traceDiagram?.traceNodes ?? [])

const contextStateOf = (segment: Segment): SectionState => stateOf(true, segment.context.trim() !== "")

const traceStateOf = (segments: readonly Segment[]): SectionState => {
  const nodes = segments.flatMap(traceNodesOf)
  const isWritten = nodes.some(isTraceNodeWritten) || segments.some((segment) => (segment.traceDiagram?.description ?? null) !== null)
  return stateOf(nodes.length > 0, isWritten)
}

const blastStateOf = ({ blastDiagram }: Segment): SectionState =>
  blastDiagram === null
    ? "empty"
    : stateOf(listReachedPaths(blastDiagram).size > 0, blastDiagram.nodes.some((node) => node.impactType !== null))

const walkthroughStateOf = (segment: Segment): SectionState => {
  const waypoints = waypointsOf(segment).map(({ waypoint }) => waypoint)
  return stateOf(waypoints.length > 0, waypoints.some((waypoint) => waypoint.title !== null || waypoint.reading.trim() !== ""))
}

const noticeOf = (state: SectionState): string | null => (state === "unwritten" ? NO_WRITE_UP_LABEL : null)

export const writeUpNoticesOf = (segment: Segment, traceSegments: readonly Segment[], isWriting: boolean): WriteUpNotices =>
  isWriting
    ? NO_WRITE_UP_NOTICES
    : {
        context: noticeOf(contextStateOf(segment)),
        traceDiagram: noticeOf(traceStateOf(traceSegments)),
        blastDiagram: noticeOf(blastStateOf(segment)),
        walkthrough: noticeOf(walkthroughStateOf(segment)),
      }
