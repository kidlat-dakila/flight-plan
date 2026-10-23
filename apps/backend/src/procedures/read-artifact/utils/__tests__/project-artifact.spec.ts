import { projectSegments } from "@/procedures/read-artifact/utils/project-artifact"
import type { Segment } from "@flightplan/configurations"
import { DRAFT_ARTIFACT, DRAFT_SEGMENT } from "./artifact-fixture"

const [BLOCK] = DRAFT_SEGMENT.traceDiagram?.traceNodes[0].codeBlocks ?? []

const withBlockOnFirstWaypoint = (segment: Segment): Segment => ({
  ...segment,
  walkthrough: {
    ...segment.walkthrough,
    files: segment.walkthrough.files.map((file, fileIndex) => ({
      ...file,
      waypoints: file.waypoints.map((waypoint, index) => (fileIndex === 0 && index === 0 ? { ...waypoint, codeBlocks: [BLOCK] } : waypoint)),
    })),
  },
})

describe("the waypoints an agent reads", () => {
  it.each(["code-walkthrough", "full"] as const)("carry the ids of their code blocks in place of the blocks in the %s section", (section) => {
    const projected = projectSegments(section, DRAFT_ARTIFACT, [withBlockOnFirstWaypoint(DRAFT_SEGMENT)])

    const sent = JSON.stringify(projected)

    expect(sent).toContain(`"codeBlockIds":["${BLOCK.id}"]`)
    expect(sent).not.toContain("\"codeBlocks\"")
  })
})

describe("the full artifact an agent reads", () => {
  it("leaves out the Blast Diagram a segment only shows with segments off", () => {
    const hiddenBlastDiagram = { nodes: [], edges: [] }

    const sent = JSON.stringify(projectSegments("full", DRAFT_ARTIFACT, [{ ...DRAFT_SEGMENT, hiddenBlastDiagram }]))

    expect(sent).not.toContain("hiddenBlastDiagram")
  })
})
