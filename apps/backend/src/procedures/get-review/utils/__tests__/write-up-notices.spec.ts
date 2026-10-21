import { NO_WRITE_UP_NOTICES, writeUpNoticesOf } from "@/procedures/get-review/utils/write-up-notices"
import { DRAFT_SEGMENT, WALKTHROUGH_ONLY_SEGMENT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import type { Segment } from "@flightplan/configurations"

const UNWRITTEN = "Not explained yet"

const withTraceLabel = (segment: Segment): Segment => ({
  ...segment,
  traceDiagram: segment.traceDiagram === null
    ? null
    : { ...segment.traceDiagram, traceNodes: segment.traceDiagram.traceNodes.map((node) => ({ ...node, label: "Adds the line totals" })) },
})

const withAssessedFile = (segment: Segment): Segment => ({
  ...segment,
  blastDiagram: segment.blastDiagram === null
    ? null
    : {
        ...segment.blastDiagram,
        nodes: segment.blastDiagram.nodes.map((node) =>
          (node.path === "src/cart/CartTotal.tsx" ? { ...node, impactType: "behaviour-changes", impactReason: "Shows the rounded total." } : node)),
      },
})

const withWaypointReading = (segment: Segment): Segment => ({
  ...segment,
  walkthrough: {
    files: segment.walkthrough.files.map((file, position) =>
      (position === 0 ? { ...file, waypoints: file.waypoints.map((waypoint) => ({ ...waypoint, reading: "Reads the price." })) } : file)),
  },
})

describe("writeUpNoticesOf", () => {
  it("says every section that has parts to write and none written has no write-up yet", () => {
    expect(writeUpNoticesOf(DRAFT_SEGMENT, [DRAFT_SEGMENT], false)).toStrictEqual({
      context: UNWRITTEN,
      traceDiagram: UNWRITTEN,
      blastDiagram: UNWRITTEN,
      walkthrough: UNWRITTEN,
    })
  })

  it("says nothing of a section once one part of it is written", () => {
    const written = withWaypointReading(withAssessedFile(withTraceLabel({ ...DRAFT_SEGMENT, context: "Rounding moved." })))

    expect(writeUpNoticesOf(written, [written], false)).toStrictEqual(NO_WRITE_UP_NOTICES)
  })

  it("counts the Trace Diagram written when any diagram of a review without segments has a description", () => {
    const described: Segment = DRAFT_SEGMENT.traceDiagram === null
      ? DRAFT_SEGMENT
      : { ...DRAFT_SEGMENT, id: "second", traceDiagram: { ...DRAFT_SEGMENT.traceDiagram, description: "A shopper opens the cart." } }

    expect(writeUpNoticesOf(DRAFT_SEGMENT, [DRAFT_SEGMENT, described], false).traceDiagram).toBeNull()
  })

  it("says nothing of a section with nothing to write: no diagram, no file to assess, no waypoint", () => {
    const empty: Segment = { ...WALKTHROUGH_ONLY_SEGMENT, walkthrough: { files: [] } }

    expect(writeUpNoticesOf(empty, [empty], false)).toStrictEqual({ context: UNWRITTEN, traceDiagram: null, blastDiagram: null, walkthrough: null })
  })

  it("says nothing while an agent is writing the review", () => {
    expect(writeUpNoticesOf(DRAFT_SEGMENT, [DRAFT_SEGMENT], true)).toStrictEqual(NO_WRITE_UP_NOTICES)
  })
})
