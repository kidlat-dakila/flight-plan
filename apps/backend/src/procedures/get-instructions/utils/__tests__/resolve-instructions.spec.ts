import { createSampleInstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { buildInstructionIndex, resolveFields } from "@/procedures/get-instructions/utils/resolve-instructions"
import { shippedConfigurationOf } from "@/procedures/list-configurations/utils/configuration"

const TEXTS = createSampleInstructionTexts()

const STANDARD_ONLY = {
  system: TEXTS.system,
  presets: new Map([["standard", TEXTS.presets.get("standard") ?? new Map<string, string>()]]),
}

describe("buildInstructionIndex", () => {
  it("names the configuration and every field with what it is, those of every section included", () => {
    const index = buildInstructionIndex("onboardee", { requiresContextCodeBlocks: true })

    expect(index).toMatchObject({ configuration: "onboardee", requiresContextCodeBlocks: true })
    expect(index.fields.map((field) => field.path)).toStrictEqual(expect.arrayContaining(["traceDiagram.description", "blastDiagram.nodes.impactReason", "walkthrough.files.waypoints.findings.title"]))
    expect(index.fields).toContainEqual({ path: "writingStyle", title: "The shared voice. Fetch before writing any prose." })
    expect(index.fields.map((field) => field.path)).toContain("contextCodeBlocks.description")
  })

  it("leaves out the fields of the context code blocks where the configuration asks for none", () => {
    const index = buildInstructionIndex("standard", { requiresContextCodeBlocks: false })

    expect(index.requiresContextCodeBlocks).toBe(false)
    expect(index.fields.map((field) => field.path).filter((path) => path.startsWith("contextCodeBlocks"))).toStrictEqual([])
  })
})

describe("resolveFields", () => {
  it("gives an editable field its description, the preset's instruction and its options", () => {
    expect(resolveFields(["walkthrough.files.waypoints.findings.kind"], TEXTS, shippedConfigurationOf("minimal"))).toStrictEqual({
      kind: "resolved",
      fields: [{
        path: "walkthrough.files.waypoints.findings.kind",
        kind: "editable",
        description: "What walkthrough.files.waypoints.findings.kind is.",
        instruction: "How minimal writes walkthrough.files.waypoints.findings.kind.",
        options: {
          bug: "How minimal writes walkthrough.files.waypoints.findings.kind.bug.",
          risk: "How minimal writes walkthrough.files.waypoints.findings.kind.risk.",
          nit: "How minimal writes walkthrough.files.waypoints.findings.kind.nit.",
          question: "How minimal writes walkthrough.files.waypoints.findings.kind.question.",
        },
      }],
    })
  })

  it("gives a static field its description only", () => {
    expect(resolveFields(["codeLinks"], TEXTS, shippedConfigurationOf("standard"))).toStrictEqual({
      kind: "resolved",
      fields: [{ path: "codeLinks", kind: "static", description: "What codeLinks is.", instruction: null, options: null }],
    })
  })

  it("gives the instruction a configuration rewrote in place of its preset's", () => {
    const shortReviews = { ...shippedConfigurationOf("standard"), id: "short-reviews", instructions: { writingStyle: "Write short." } }

    expect(resolveFields(["writingStyle"], TEXTS, shortReviews)).toMatchObject({
      kind: "resolved",
      fields: [{ path: "writingStyle", instruction: "Write short." }],
    })
  })

  it("falls back to Standard for what a preset does not write", () => {
    expect(resolveFields(["context"], STANDARD_ONLY, shippedConfigurationOf("minimal"))).toMatchObject({
      fields: [{ instruction: "How standard writes context." }],
    })
  })

  it("resolves every field when none is named", () => {
    const resolution = resolveFields(null, TEXTS, shippedConfigurationOf("standard"))

    expect(resolution.kind === "resolved" ? resolution.fields.length : 0).toBe(29)
  })

  it("names the unknown paths and the known ones that end the same way", () => {
    expect(resolveFields(["waypoints.reading", "nothing"], TEXTS, shippedConfigurationOf("standard"))).toStrictEqual({
      kind: "unknown",
      paths: ["waypoints.reading", "nothing"],
      nearPaths: ["walkthrough.files.waypoints.reading", "walkthrough.files.waypoints.findings.reading"],
    })
  })

  it("reports the texts that are missing instead of returning an empty instruction", () => {
    const withoutVoice = { system: TEXTS.system, presets: new Map<string, ReadonlyMap<string, string>>() }

    expect(resolveFields(["writingStyle"], withoutVoice, shippedConfigurationOf("standard"))).toStrictEqual({ kind: "incomplete", keys: ["writingStyle"] })
  })
})
