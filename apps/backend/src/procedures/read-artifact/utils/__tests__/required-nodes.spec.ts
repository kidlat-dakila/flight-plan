import { WRITE_UP_SECTIONS } from "@/procedures/get-review-preferences/utils/review-preferences"
import { withRequiredBlastFile, withRequiredCard, withRequiredSections, withRequiredWaypoints } from "@/procedures/read-artifact/utils/required-nodes"
import { unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import { listTraceNodes } from "@flightplan/codegraph"
import type { ReviewArtifact, Segment } from "@flightplan/configurations"
import { DRAFT_ARTIFACT } from "./artifact-fixture"

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
    expect(unwrittenWork(GENERATED)).toStrictEqual([])
  })

  it("requires the context of the first segment alone when segments are off, and of every segment when they are on", () => {
    const twoSegments = (isSegmented: boolean): ReviewArtifact => ({
      ...GENERATED,
      isSegmented,
      segments: [{ ...segmentOf(GENERATED), id: "first" }, { ...segmentOf(GENERATED), id: "second" }],
    })

    expect(withRequiredSections(twoSegments(false), WRITE_UP_SECTIONS).segments.map((segment) => segment.isContextRequired)).toStrictEqual([true, false])
    expect(withRequiredSections(twoSegments(true), WRITE_UP_SECTIONS).segments.map((segment) => segment.isContextRequired)).toStrictEqual([true, true])
  })

  it("requires the context and every node of every write-up section", () => {
    const segment = segmentOf(withRequiredSections(GENERATED, WRITE_UP_SECTIONS))

    expect(segment.isContextRequired).toBe(true)
    expect(segment.traceDiagram?.isRequired).toBe(true)
    expect(listTraceNodes(segment.traceDiagram?.traceNodes ?? []).every((node) => node.isRequired)).toBe(true)
    expect(segment.blastDiagram?.nodes.every((node) => node.isRequired)).toBe(true)
    expect(segment.walkthrough.files.flatMap((file) => file.waypoints).every((waypoint) => waypoint.isRequired)).toBe(true)
    expect(unwrittenWork(withRequiredSections(GENERATED, WRITE_UP_SECTIONS))).toStrictEqual(unwrittenWork(DRAFT_ARTIFACT))
  })

  it("requires the nodes of the chosen sections alone", () => {
    const required = withRequiredSections(GENERATED, ["blastDiagram"])
    const segment = segmentOf(required)

    expect(segment.isContextRequired).toBe(false)
    expect(segment.traceDiagram?.isRequired).toBe(false)
    expect(segment.blastDiagram?.nodes.every((node) => node.isRequired)).toBe(true)
    expect(segment.walkthrough.files.flatMap((file) => file.waypoints).some((waypoint) => waypoint.isRequired)).toBe(false)
    expect(unwrittenWork(required).map((work) => work.target)).toStrictEqual(["blast-node", "blast-node"])
  })

  it("keeps a node required that was required before", () => {
    const once = withRequiredSections(GENERATED, ["context"])

    expect(segmentOf(withRequiredSections(once, ["walkthrough"])).isContextRequired).toBe(true)
  })

  it("requires the waypoints named alone, at any depth, and keeps the others as they were", () => {
    const required = withRequiredWaypoints(GENERATED, ["w2"])

    expect(segmentOf(required).walkthrough.files.flatMap((file) => file.waypoints).map((waypoint) => [waypoint.id, waypoint.isRequired])).toStrictEqual(
      segmentOf(GENERATED).walkthrough.files.flatMap((file) => file.waypoints).map((waypoint) => [waypoint.id, waypoint.id === "w2"]),
    )
  })

  it("requires one card of a segment's Trace Diagram, and one file of its Blast Diagram", () => {
    const card = segmentOf(withRequiredCard(GENERATED, "all", "j-subtotal"))
    const file = segmentOf(withRequiredBlastFile(GENERATED, "all", "src/cart/CartTotal.tsx"))

    expect(listTraceNodes(card.traceDiagram?.traceNodes ?? []).map((node) => [node.id, node.isRequired])).toStrictEqual(
      listTraceNodes(segmentOf(GENERATED).traceDiagram?.traceNodes ?? []).map((node) => [node.id, node.id === "j-subtotal"]),
    )
    expect(file.blastDiagram?.nodes.map((node) => [node.path, node.isRequired])).toStrictEqual(
      segmentOf(GENERATED).blastDiagram?.nodes.map((node) => [node.path, node.path === "src/cart/CartTotal.tsx"]),
    )
  })
})
