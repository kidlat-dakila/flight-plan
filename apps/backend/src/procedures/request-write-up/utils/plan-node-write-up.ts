import { countLabel } from "@/procedures/get-review/utils/count-label"
import { joinedList } from "@/procedures/get-write-up-plan/utils/joined-list"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { withRequiredBlastFile, withRequiredCard, withRequiredWaypoints } from "@/procedures/read-artifact/utils/required-nodes"
import { listRootBlockWaypointIds, listTraceNodes } from "@flightplan/codegraph"
import type { BlastNode, ReviewArtifact, Segment, TraceNode, Waypoint } from "@flightplan/configurations"
import type { WriteUpRequestResult, WriteUpTarget } from "./schemas"

export type PlannedNodeWriteUp
  = | { readonly kind: "planned", readonly artifact: ReviewArtifact, readonly ask: string, readonly message: string }
    | Exclude<WriteUpRequestResult, { kind: "started" | "queued" }>

type TargetOf<Kind extends WriteUpTarget["kind"]> = Extract<WriteUpTarget, { kind: Kind }>

const DRAFTING_STATUS = "drafting"
const ALREADY_WRITTEN: PlannedNodeWriteUp = { kind: "written", message: "This is already explained." }

const rejected = (message: string): PlannedNodeWriteUp => ({ kind: "rejected", field: "target", message })

const planned = (artifact: ReviewArtifact, ask: string, message: string): PlannedNodeWriteUp =>
  ({ kind: "planned", artifact: { ...artifact, status: DRAFTING_STATUS }, ask, message })

const quoted = (text: string): string => `\`${text}\``

const listWaypoints = (artifact: ReviewArtifact): Waypoint[] => artifact.segments.flatMap(waypointsOf).map(({ waypoint }) => waypoint)

const isWaypointUnwritten = (waypoint: Waypoint): boolean => waypoint.title === null || waypoint.reading.trim() === ""

const waypointIdsOf = (artifact: ReviewArtifact, target: TargetOf<"waypoint" | "root-block">): readonly string[] =>
  target.kind === "waypoint"
    ? listWaypoints(artifact).filter((waypoint) => waypoint.id === target.waypointId).map((waypoint) => waypoint.id)
    : listRootBlockWaypointIds(artifact, target.rootBlockId)

const waypointAskOf = (ids: readonly string[]): string =>
  ids.length === 1
    ? `The reviewer asks for the write-up of the waypoint ${quoted(ids[0])} alone: write its title and its reading, and nothing else.`
    : `The reviewer asks for the write-up of the waypoints ${joinedList(ids.map(quoted))} alone: write their titles and readings, and nothing else.`

const planWaypoints = (artifact: ReviewArtifact, target: TargetOf<"waypoint" | "root-block">): PlannedNodeWriteUp => {
  const waypointIds = waypointIdsOf(artifact, target)
  if (waypointIds.length === 0) {
    return rejected(target.kind === "waypoint" ? "This waypoint is not in the review." : "This code block has no waypoint in the review.")
  }
  const unwrittenIds = listWaypoints(artifact).filter((waypoint) => waypointIds.includes(waypoint.id) && isWaypointUnwritten(waypoint)).map((waypoint) => waypoint.id)
  if (unwrittenIds.length === 0) return ALREADY_WRITTEN
  return planned(withRequiredWaypoints(artifact, unwrittenIds), waypointAskOf(unwrittenIds), `Explaining ${countLabel(unwrittenIds.length, "waypoint", "waypoints")}`)
}

const isTraceNodeUnwritten = (node: TraceNode): boolean =>
  node.label === null || node.triggerLabels.some((trigger) => trigger.label === null) || node.blockLabels.some((listed) => listed.label === null)

const findTraceNode = (artifact: ReviewArtifact, { segmentId, nodeId }: TargetOf<"trace-node">): TraceNode | undefined =>
  listTraceNodes(artifact.segments.find((segment) => segment.id === segmentId)?.traceDiagram?.traceNodes ?? []).find((node) => node.id === nodeId)

const planTraceNode = (artifact: ReviewArtifact, target: TargetOf<"trace-node">): PlannedNodeWriteUp => {
  const node = findTraceNode(artifact, target)
  if (node === undefined) return rejected("This card is not in the Trace Diagram.")
  if (!isTraceNodeUnwritten(node)) return ALREADY_WRITTEN
  return planned(
    withRequiredCard(artifact, target.segmentId, target.nodeId),
    `The reviewer asks for the write-up of the Trace Diagram node ${quoted(target.nodeId)} of segment ${quoted(target.segmentId)} alone: write its label, its trigger labels and its block labels, each block label by its ${quoted("codeBlockId")} and its ${quoted("at")}, and nothing else.`,
    "Explaining the card",
  )
}

const blastFileIn = (segment: Segment | undefined, path: string): BlastNode | undefined =>
  segment?.blastDiagram?.nodes.find((node) => node.path === path)

const findBlastFile = (artifact: ReviewArtifact, { segmentId, path }: TargetOf<"blast-file">): BlastNode | undefined =>
  blastFileIn(artifact.segments.find((segment) => segment.id === segmentId), path)

const blastTargetOf = (artifact: ReviewArtifact, target: TargetOf<"blast-file">): TargetOf<"blast-file"> => {
  const isNamedSegment = artifact.segments.some((segment) => segment.id === target.segmentId)
  if (artifact.isSegmented || !isNamedSegment || findBlastFile(artifact, target) !== undefined) return target
  const holder = artifact.segments.find((segment) => blastFileIn(segment, target.path) !== undefined)
  return holder === undefined ? target : { ...target, segmentId: holder.id }
}

const planBlastFile = (artifact: ReviewArtifact, requested: TargetOf<"blast-file">): PlannedNodeWriteUp => {
  const target = blastTargetOf(artifact, requested)
  const node = findBlastFile(artifact, target)
  if (node === undefined) return rejected("This file is not in the Blast Diagram.")
  if (node.diffType !== null) return rejected("This file is part of the change, so it has no impact to assess.")
  if (node.impactType !== null) return ALREADY_WRITTEN
  return planned(
    withRequiredBlastFile(artifact, target.segmentId, target.path),
    `The reviewer asks for the impact of the change on ${quoted(target.path)} in the Blast Diagram of segment ${quoted(target.segmentId)} alone: write its impact type and its reason, and nothing else.`,
    "Assessing the file",
  )
}

export const planNodeWriteUp = (artifact: ReviewArtifact, target: WriteUpTarget): PlannedNodeWriteUp => {
  if (target.kind === "trace-node") return planTraceNode(artifact, target)
  if (target.kind === "blast-file") return planBlastFile(artifact, target)
  return planWaypoints(artifact, target)
}
