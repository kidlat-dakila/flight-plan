import type { WriteUpSection } from "@/procedures/get-review-preferences/utils/review-preferences"
import type { Blast, ReviewArtifact, Segment, TraceDiagram, TraceNode, Waypoint } from "@flightplan/configurations"

const withRequiredWaypoint = (waypoint: Waypoint): Waypoint => ({
  ...waypoint,
  isRequired: true,
  children: waypoint.children.map(withRequiredWaypoint),
})

const withRequiredTraceNode = (node: TraceNode): TraceNode => ({
  ...node,
  isRequired: true,
  children: node.children.map(withRequiredTraceNode),
})

const withRequiredTrace = (traceDiagram: TraceDiagram): TraceDiagram => ({
  ...traceDiagram,
  isRequired: true,
  traceNodes: traceDiagram.traceNodes.map(withRequiredTraceNode),
})

const withRequiredBlast = (blastDiagram: Blast): Blast => ({
  ...blastDiagram,
  nodes: blastDiagram.nodes.map((node) => ({ ...node, isRequired: true })),
})

const withRequiredSegment = (segment: Segment, sections: readonly WriteUpSection[], isContextOwed: boolean): Segment => ({
  ...segment,
  isContextRequired: segment.isContextRequired || (isContextOwed && sections.includes("context")),
  traceDiagram: sections.includes("traceDiagram") && segment.traceDiagram !== null ? withRequiredTrace(segment.traceDiagram) : segment.traceDiagram,
  blastDiagram: sections.includes("blastDiagram") && segment.blastDiagram !== null ? withRequiredBlast(segment.blastDiagram) : segment.blastDiagram,
  walkthrough: sections.includes("walkthrough")
    ? { files: segment.walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map(withRequiredWaypoint) })) }
    : segment.walkthrough,
})

const isContextOwed = (artifact: ReviewArtifact, position: number): boolean => artifact.isSegmented || position === 0

export const withRequiredSections = (artifact: ReviewArtifact, sections: readonly WriteUpSection[]): ReviewArtifact => ({
  ...artifact,
  segments: artifact.segments.map((segment, position) => withRequiredSegment(segment, sections, isContextOwed(artifact, position))),
})

const withRequiredWaypointIn = (waypoint: Waypoint, waypointIds: ReadonlySet<string>): Waypoint => ({
  ...waypoint,
  isRequired: waypoint.isRequired || waypointIds.has(waypoint.id),
  children: waypoint.children.map((child) => withRequiredWaypointIn(child, waypointIds)),
})

export const withRequiredWaypoints = (artifact: ReviewArtifact, waypointIds: readonly string[]): ReviewArtifact => {
  const required = new Set(waypointIds)
  return {
    ...artifact,
    segments: artifact.segments.map((segment) => ({
      ...segment,
      walkthrough: { files: segment.walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map((waypoint) => withRequiredWaypointIn(waypoint, required)) })) },
    })),
  }
}

const withRequiredTraceNodeIn = (node: TraceNode, nodeId: string): TraceNode => ({
  ...node,
  isRequired: node.isRequired || node.id === nodeId,
  children: node.children.map((child) => withRequiredTraceNodeIn(child, nodeId)),
})

const inSegment = (artifact: ReviewArtifact, segmentId: string, change: (segment: Segment) => Segment): ReviewArtifact => ({
  ...artifact,
  segments: artifact.segments.map((segment) => (segment.id === segmentId ? change(segment) : segment)),
})

export const withRequiredCard = (artifact: ReviewArtifact, segmentId: string, nodeId: string): ReviewArtifact =>
  inSegment(artifact, segmentId, (segment) => ({
    ...segment,
    traceDiagram: segment.traceDiagram === null
      ? null
      : { ...segment.traceDiagram, traceNodes: segment.traceDiagram.traceNodes.map((node) => withRequiredTraceNodeIn(node, nodeId)) },
  }))

export const withRequiredBlastFile = (artifact: ReviewArtifact, segmentId: string, path: string): ReviewArtifact =>
  inSegment(artifact, segmentId, (segment) => ({
    ...segment,
    blastDiagram: segment.blastDiagram === null
      ? null
      : { ...segment.blastDiagram, nodes: segment.blastDiagram.nodes.map((node) => (node.path === path ? { ...node, isRequired: true } : node)) },
  }))
