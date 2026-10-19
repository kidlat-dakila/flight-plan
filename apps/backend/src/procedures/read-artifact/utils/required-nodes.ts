import type { Blast, ReviewArtifact, SectionSwitches, Segment, TraceDiagram, TraceNode, Waypoint } from "@flightplan/configurations"

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

const withRequiredSegment = (segment: Segment, sections: SectionSwitches): Segment => ({
  ...segment,
  isContextRequired: true,
  traceDiagram: sections.traceDiagram && segment.traceDiagram !== null ? withRequiredTrace(segment.traceDiagram) : segment.traceDiagram,
  blastDiagram: sections.blastDiagram && segment.blastDiagram !== null ? withRequiredBlast(segment.blastDiagram) : segment.blastDiagram,
  walkthrough: sections.walkthrough
    ? { files: segment.walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map(withRequiredWaypoint) })) }
    : segment.walkthrough,
})

export const withRequiredSections = (artifact: ReviewArtifact, sections: SectionSwitches): ReviewArtifact => ({
  ...artifact,
  segments: artifact.segments.map((segment) => withRequiredSegment(segment, sections)),
})

export const withRequiredSection = (artifact: ReviewArtifact, section: keyof SectionSwitches): ReviewArtifact => ({
  ...artifact,
  segments: artifact.segments.map((segment) => {
    const required = withRequiredSegment(segment, { traceDiagram: false, blastDiagram: false, walkthrough: false, findings: false, [section]: true })
    return { ...required, isContextRequired: segment.isContextRequired }
  }),
})
