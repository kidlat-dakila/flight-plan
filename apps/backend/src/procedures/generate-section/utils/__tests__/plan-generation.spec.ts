import { planGeneration } from "@/procedures/generate-section/utils/plan-generation"
import { DRAFT_ARTIFACT, DRAFT_SEGMENT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { withSections } from "@/procedures/read-artifact/utils/artifact-sections"

const OFF = { journey: false, blast: false, walkthrough: true, findings: false }
const UNGENERATED = withSections({ ...DRAFT_ARTIFACT, status: "complete" }, OFF)
const AGENT = { kind: "agent", agent: "claude", model: "default", effort: "default" } as const

describe("planGeneration", () => {
  it("takes the diagram of the segment with the same changed files from the rebuilt artifact", () => {
    const rebuilt = { ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, id: "rebuilt" }] }

    const planned = planGeneration(UNGENERATED, { section: "blast", rebuilt, writer: AGENT })

    expect(planned.sections).toStrictEqual({ ...OFF, blast: true })
    expect(planned.segments.map((segment) => [segment.id, segment.journey, segment.blast])).toStrictEqual([
      [DRAFT_SEGMENT.id, null, DRAFT_SEGMENT.blast],
    ])
    expect(planned.status).toBe("drafting")
  })

  it("leaves a segment the rebuilt artifact does not have without a diagram", () => {
    const rebuilt = { ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, changedPaths: ["src/other.ts"] }] }

    expect(planGeneration(UNGENERATED, { section: "journey", rebuilt, writer: AGENT }).segments.map((segment) => segment.journey)).toStrictEqual([null])
  })

  it("switches a section with no structure on and leaves the segments as they are", () => {
    const planned = planGeneration(UNGENERATED, { section: "findings", rebuilt: null, writer: { kind: "author", start: "scaffold" } })

    expect(planned).toStrictEqual({ ...UNGENERATED, sections: { ...OFF, findings: true } })
  })
})
