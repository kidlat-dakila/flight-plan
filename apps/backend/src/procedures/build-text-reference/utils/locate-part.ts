import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { contextIdOf, listTraceNodes } from "@flightplan/codegraph"
import type { ReviewArtifact, Segment } from "@flightplan/configurations"
import type { ArtifactPart } from "./schemas"

type SegmentPart = Extract<ArtifactPart, { readonly segmentId: string }>

type ArtifactWidePart = Exclude<ArtifactPart, SegmentPart>

const REVIEW_PART: ArtifactPart = { kind: "review" }

const hasWaypoint = (artifact: ReviewArtifact, waypointId: string): boolean =>
  artifact.segments.flatMap(waypointsOf).some(({ waypoint }) => waypoint.id === waypointId)

const hasContextCodeBlock = (artifact: ReviewArtifact, blockId: string): boolean =>
  artifact.contextCodeBlocks.some((block) => contextIdOf(block) === blockId)

const hasTraceNode = (segment: Segment, nodeId: string): boolean =>
  listTraceNodes(segment.traceDiagram?.traceNodes ?? []).some((node) => node.id === nodeId)

const blastPathsOf = (segment: Segment): string[] => {
  const blast = segment.blastDiagram
  if (blast === null) return []
  return [...blast.nodes, ...(blast.importBound?.nodes ?? [])].map((node) => node.path)
}

const isInArtifact = (artifact: ReviewArtifact, part: ArtifactWidePart): boolean => {
  if (part.kind === "waypoint") return hasWaypoint(artifact, part.waypointId)
  if (part.kind === "context-code-block") return hasContextCodeBlock(artifact, part.blockId)
  return true
}

const isInSegment = (segment: Segment, part: SegmentPart): boolean => {
  if (part.kind === "trace-diagram") return segment.traceDiagram !== null
  if (part.kind === "trace-node") return hasTraceNode(segment, part.nodeId)
  if (part.kind === "blast-node") return blastPathsOf(segment).includes(part.path)
  return true
}

const locateSegmentPart = (artifact: ReviewArtifact, part: SegmentPart): ArtifactPart => {
  const segment = artifact.segments.find(({ id }) => id === part.segmentId)
  if (segment === undefined) return REVIEW_PART
  return isInSegment(segment, part) ? part : { kind: "segment", segmentId: segment.id }
}

const locateArtifactWidePart = (artifact: ReviewArtifact, part: ArtifactWidePart): ArtifactPart =>
  (isInArtifact(artifact, part) ? part : REVIEW_PART)

export const locatePart = (artifact: ReviewArtifact, part: ArtifactPart): ArtifactPart =>
  ("segmentId" in part ? locateSegmentPart(artifact, part) : locateArtifactWidePart(artifact, part))
