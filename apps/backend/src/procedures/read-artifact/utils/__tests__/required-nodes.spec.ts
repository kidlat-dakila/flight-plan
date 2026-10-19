import { withRequiredSection, withRequiredSections } from "@/procedures/read-artifact/utils/required-nodes"
import { unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import { listTraceNodes } from "@flightplan/codegraph"
import type { ReviewArtifact, SectionSwitches, Segment } from "@flightplan/configurations"
import { DRAFT_ARTIFACT } from "./artifact-fixture"

const ALL_ON: SectionSwitches = { traceDiagram: true, blastDiagram: true, walkthrough: true, findings: true }

const withNothingRequired = (segment: Segment): Segment => ({
  ...segment,
  isContextRequired: false,
  traceDiagram: segment.traceDiagram === null
    ? null
    : {
        ...segment.traceDiagram,
        isRequired: false,
        traceNodes: segment.traceDiagram.traceNodes.map((node) => ({ ...node, isRequired: false })),
      },
  blastDiagram: segment.blastDiagram === null
    ? null
    : { ...segment.blastDiagram, nodes: segment.blastDiagram.nodes.map((node) => ({ ...node, isRequired: false })) },
  walkthrough: {
    files: segment.walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map((waypoint) => ({ ...waypoint, isRequired: false })) })),
  },
})

const GENERATED: ReviewArtifact = { ...DRAFT_ARTIFACT, segments: DRAFT_ARTIFACT.segments.map(withNothingRequired) }

const segmentOf = (artifact: ReviewArtifact): Segment => artifact.segments[0]

describe("required nodes", () => {
  it("asks for nothing on a freshly generated artifact, so it counts as complete", () => {
    expect(unwrittenWork(GENERATED, ALL_ON)).toStrictEqual([])
  })

  it("requires the context and every node of the sections that are on", () => {
    const segment = segmentOf(withRequiredSections(GENERATED, ALL_ON))

    expect(segment.isContextRequired).toBe(true)
    expect(segment.traceDiagram?.isRequired).toBe(true)
    expect(listTraceNodes(segment.traceDiagram?.traceNodes ?? []).every((node) => node.isRequired)).toBe(true)
    expect(segment.blastDiagram?.nodes.every((node) => node.isRequired)).toBe(true)
    expect(segment.walkthrough.files.flatMap((file) => file.waypoints).every((waypoint) => waypoint.isRequired)).toBe(true)
    expect(unwrittenWork(withRequiredSections(GENERATED, ALL_ON), ALL_ON)).toStrictEqual(unwrittenWork(DRAFT_ARTIFACT, ALL_ON))
  })

  it("leaves the nodes of a section that is off unrequired", () => {
    const segment = segmentOf(withRequiredSections(GENERATED, { ...ALL_ON, blastDiagram: false, traceDiagram: false }))

    expect(segment.traceDiagram?.isRequired).toBe(false)
    expect(segment.blastDiagram?.nodes.some((node) => node.isRequired)).toBe(false)
    expect(segment.walkthrough.files.flatMap((file) => file.waypoints).every((waypoint) => waypoint.isRequired)).toBe(true)
  })

  it("requires one section alone, without the context", () => {
    const segment = segmentOf(withRequiredSection(GENERATED, "blastDiagram"))

    expect(segment.isContextRequired).toBe(false)
    expect(segment.blastDiagram?.nodes.every((node) => node.isRequired)).toBe(true)
    expect(segment.walkthrough.files.flatMap((file) => file.waypoints).some((waypoint) => waypoint.isRequired)).toBe(false)
    expect(unwrittenWork(withRequiredSection(GENERATED, "blastDiagram"), ALL_ON).map((work) => work.target)).toStrictEqual([
      "blast-node",
      "blast-node",
    ])
  })
})
