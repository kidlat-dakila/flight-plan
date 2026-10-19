import { totalCountOf, writeUpCountsOf } from "@/procedures/get-write-up-plan/utils/write-up-counts"
import { DRAFT_ARTIFACT, WALKTHROUGH_ONLY_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"

describe("writeUpCountsOf", () => {
  it("counts the parts still unwritten in each section, and the waypoints to check for findings", () => {
    expect(writeUpCountsOf(WALKTHROUGH_ONLY_ARTIFACT)).toStrictEqual({ context: 1, traceDiagram: 0, blastDiagram: 0, walkthrough: 3, findings: 3 })
  })

  it("counts the diagrams' parts where the artifact has diagrams", () => {
    const counts = writeUpCountsOf(DRAFT_ARTIFACT)

    expect(counts.traceDiagram).toBeGreaterThan(0)
    expect(counts.blastDiagram).toBeGreaterThan(0)
  })

  it("counts nothing a written part already holds", () => {
    const written = { ...WALKTHROUGH_ONLY_ARTIFACT, segments: WALKTHROUGH_ONLY_ARTIFACT.segments.map((segment) => ({ ...segment, context: "This segment rounds once.", title: "Rounding" })) }

    expect(writeUpCountsOf(written).context).toBe(0)
  })
})

describe("totalCountOf", () => {
  it("adds the counts of the chosen sections", () => {
    expect(totalCountOf({ context: 1, traceDiagram: 2, blastDiagram: 4, walkthrough: 8, findings: 16 }, ["context", "walkthrough"])).toBe(9)
  })
})
