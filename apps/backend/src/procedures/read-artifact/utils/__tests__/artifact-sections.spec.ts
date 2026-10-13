import { DRAFT_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { offSectionOfField, sectionsOf, switchedOffSections, withSections } from "@/procedures/read-artifact/utils/artifact-sections"

const OFF = { journey: false, blast: false, walkthrough: true, findings: false }

describe("the sections of an artifact", () => {
  it("has every section on when the artifact holds no switches", () => {
    expect(sectionsOf(DRAFT_ARTIFACT)).toStrictEqual({ journey: true, blast: true, walkthrough: true, findings: true })
  })

  it("keeps the switches with the artifact and holds no diagram that is switched off", () => {
    const stored = withSections(DRAFT_ARTIFACT, { ...OFF, blast: true })

    expect(sectionsOf(stored)).toStrictEqual({ ...OFF, blast: true })
    expect(stored.segments.map((segment) => [segment.journey, segment.blast === null])).toStrictEqual([[null, false]])
    expect(stored.segments.map((segment) => segment.walkthrough)).toStrictEqual(DRAFT_ARTIFACT.segments.map((segment) => segment.walkthrough))
  })

  it("lists the sections that are off, in the order of their names", () => {
    expect(switchedOffSections(OFF)).toStrictEqual(["journey", "blast", "findings"])
  })

  it("names the section that is off for a field of it, and none for any other field", () => {
    expect(offSectionOfField("journey.nodes.label", OFF)).toBe("journey")
    expect(offSectionOfField("walkthrough.files.waypoints.findings", OFF)).toBe("findings")
    expect(offSectionOfField("walkthrough.files.waypoints.findings.kind", OFF)).toBe("findings")
    expect(offSectionOfField("walkthrough.files.waypoints.reading", OFF)).toBeNull()
    expect(offSectionOfField("context", OFF)).toBeNull()
  })
})
