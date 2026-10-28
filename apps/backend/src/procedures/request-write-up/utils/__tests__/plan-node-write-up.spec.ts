import { DRAFT_ARTIFACT, SUBTOTAL_PATH, WALKTHROUGH_ONLY_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { planNodeWriteUp } from "@/procedures/request-write-up/utils/plan-node-write-up"
import { listTraceNodes } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"

const UNREQUIRED: ReviewArtifact = {
  ...WALKTHROUGH_ONLY_ARTIFACT,
  status: "complete",
  segments: WALKTHROUGH_ONLY_ARTIFACT.segments.map((segment) => ({
    ...segment,
    walkthrough: { files: segment.walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map((waypoint) => ({ ...waypoint, isRequired: false })) })) },
  })),
}

const requiredIdsOf = (artifact: ReviewArtifact): string[] =>
  artifact.segments.flatMap(waypointsOf).filter(({ waypoint }) => waypoint.isRequired).map(({ waypoint }) => waypoint.id)

describe("planNodeWriteUp", () => {
  it("requires the one waypoint asked for and makes the review drafting", () => {
    const planned = planNodeWriteUp(UNREQUIRED, { kind: "waypoint", waypointId: "w2" })

    expect(planned).toMatchObject({
      kind: "planned",
      ask: "The reviewer asks for the write-up of the waypoint `w2` alone: write its title and its reading, and nothing else.",
      message: "Explaining 1 waypoint",
      artifact: { status: "drafting" },
    })
    expect(planned.kind === "planned" ? requiredIdsOf(planned.artifact) : []).toStrictEqual(["w2"])
  })

  it("refuses a waypoint and a code block the review does not have", () => {
    expect(planNodeWriteUp(UNREQUIRED, { kind: "waypoint", waypointId: "gone" })).toStrictEqual({ kind: "rejected", field: "target", message: "This waypoint is not in the review." })
    expect(planNodeWriteUp(UNREQUIRED, { kind: "root-block", rootBlockId: "src/gone.ts#function:gone" })).toStrictEqual({
      kind: "rejected",
      field: "target",
      message: "This code block has no waypoint in the review.",
    })
  })

  it("asks for nothing when the waypoint is already written", () => {
    const written = {
      ...UNREQUIRED,
      segments: UNREQUIRED.segments.map((segment) => ({
        ...segment,
        walkthrough: { files: segment.walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map((waypoint) => ({ ...waypoint, title: "Rounded", reading: "Rounds once." })) })) },
      })),
    }

    expect(planNodeWriteUp(written, { kind: "waypoint", waypointId: "w2" })).toStrictEqual({ kind: "written", message: "This is already explained." })
  })

  it("requires one Trace Diagram card and asks for its labels", () => {
    const planned = planNodeWriteUp(DRAFT_ARTIFACT, { kind: "trace-node", segmentId: "all", nodeId: "j-subtotal" })

    expect(planned).toMatchObject({ kind: "planned", message: "Explaining the card" })
    expect(planned.kind === "planned" ? planned.ask : "").toBe(
      "The reviewer asks for the write-up of the Trace Diagram node `j-subtotal` of segment `all` alone: write its label, its trigger labels and its block labels, each block label by its `codeBlockId` and its `at`, and nothing else.",
    )
    expect(planned.kind === "planned" ? listTraceNodes(planned.artifact.segments[0].traceDiagram?.traceNodes ?? []).find((node) => node.id === "j-subtotal")?.isRequired : false).toBe(true)
  })

  it("requires one Blast Diagram file and asks for its impact, and refuses a file of the change", () => {
    const planned = planNodeWriteUp(DRAFT_ARTIFACT, { kind: "blast-file", segmentId: "all", path: "src/cart/CartTotal.tsx" })

    expect(planned).toMatchObject({ kind: "planned", message: "Assessing the file" })
    expect(planned.kind === "planned" ? planned.ask : "").toContain("`src/cart/CartTotal.tsx` in the Blast Diagram of segment `all` alone")
    expect(planNodeWriteUp(DRAFT_ARTIFACT, { kind: "blast-file", segmentId: "all", path: SUBTOTAL_PATH })).toStrictEqual({
      kind: "rejected",
      field: "target",
      message: "This file is part of the change, so it has no impact to assess.",
    })
  })

  it("finds a file in the segment that holds it when a review without segments names the segment it shows", () => {
    const [segment] = DRAFT_ARTIFACT.segments
    const twoSegments: ReviewArtifact = {
      ...DRAFT_ARTIFACT,
      isSegmented: false,
      segments: [{ ...segment, id: "first", blastDiagram: null }, { ...segment, id: "second" }],
    }

    const planned = planNodeWriteUp(twoSegments, { kind: "blast-file", segmentId: "first", path: "src/cart/CartTotal.tsx" })

    expect(planned.kind === "planned" ? planned.ask : "").toContain("in the Blast Diagram of segment `second` alone")
    expect(planned.kind === "planned" ? planned.artifact.segments[1].blastDiagram?.nodes.find((node) => node.path === "src/cart/CartTotal.tsx")?.isRequired : false).toBe(true)
    expect(planNodeWriteUp({ ...twoSegments, isSegmented: true }, { kind: "blast-file", segmentId: "first", path: "src/cart/CartTotal.tsx" })).toMatchObject({ kind: "rejected" })
  })

  it("refuses a card or a file the diagrams do not have", () => {
    expect(planNodeWriteUp(DRAFT_ARTIFACT, { kind: "trace-node", segmentId: "all", nodeId: "gone" })).toMatchObject({ kind: "rejected", message: "This card is not in the Trace Diagram." })
    expect(planNodeWriteUp(DRAFT_ARTIFACT, { kind: "blast-file", segmentId: "other", path: "src/cart/CartTotal.tsx" })).toMatchObject({ kind: "rejected", message: "This file is not in the Blast Diagram." })
  })
})
