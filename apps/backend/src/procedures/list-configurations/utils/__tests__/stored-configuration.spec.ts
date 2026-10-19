import type { SavedConfiguration } from "@/procedures/list-configurations/utils/configuration"
import {
  formatConfigurationFiles,
  parseConfigurationFiles,
  planFileChanges,
  storedConfigurationsOf,
} from "@/procedures/list-configurations/utils/stored-configuration"
import { PRESET_CONTEXT_CODE_BLOCK_KINDS, PRESET_SECTIONS } from "@flightplan/configurations"

const TERSE: SavedConfiguration = {
  id: "custom-terse",
  name: "Terse",
  preset: "standard",
  sections: PRESET_SECTIONS.standard,
  contextCodeBlockKinds: PRESET_CONTEXT_CODE_BLOCK_KINDS.standard,
  instructions: { "context": "Two sentences.", "walkthrough.files.waypoints.findings.kind.bug": "Wrong on some input." },
}

const DESCRIPTION_TEXT = formatConfigurationFiles(TERSE).get("configuration.json") ?? ""

describe("formatConfigurationFiles", () => {
  it("writes one Markdown file per instruction beside the description of the configuration", () => {
    expect(formatConfigurationFiles(TERSE)).toStrictEqual(new Map([
      ["configuration.json", DESCRIPTION_TEXT],
      ["context.md", "Two sentences."],
      ["walkthrough.files.waypoints.findings.kind.bug.md", "Wrong on some input."],
    ]))
    expect(JSON.parse(DESCRIPTION_TEXT)).toStrictEqual({
      name: "Terse",
      preset: "standard",
      sections: PRESET_SECTIONS.standard,
      contextCodeBlockKinds: PRESET_CONTEXT_CODE_BLOCK_KINDS.standard,
    })
  })
})

describe("parseConfigurationFiles", () => {
  it("reads back the configuration it wrote, named by its folder", () => {
    expect(parseConfigurationFiles("custom-terse", formatConfigurationFiles(TERSE))).toStrictEqual(TERSE)
  })

  it("reads a configuration saved while the diagrams were named journey and blast under their current names", () => {
    const { traceDiagram, blastDiagram, ...otherSections } = PRESET_SECTIONS.minimal
    const older = new Map([
      ["configuration.json", JSON.stringify({ ...JSON.parse(DESCRIPTION_TEXT), sections: { ...otherSections, journey: traceDiagram, blast: blastDiagram } })],
      ["journey.nodes.label.md", "The step, in a verb."],
      ["blast.nodes.impactReason.md", "What breaks."],
    ])

    expect(parseConfigurationFiles("custom-terse", older)).toStrictEqual({
      ...TERSE,
      sections: PRESET_SECTIONS.minimal,
      instructions: { "traceDiagram.nodes.label": "The step, in a verb.", "blastDiagram.nodes.impactReason": "What breaks." },
    })
  })

  it("reads no configuration from a folder without a readable description", () => {
    expect(parseConfigurationFiles("notes", new Map([["context.md", "Two sentences."]]))).toBeNull()
    expect(parseConfigurationFiles("broken", new Map([["configuration.json", "{ broken"]]))).toBeNull()
  })
})

describe("storedConfigurationsOf", () => {
  it("lists the configuration folders by id and leaves out the other folders", () => {
    const folders = new Map([
      ["notes", new Map([["context.md", "Two sentences."]])],
      ["custom-terse", formatConfigurationFiles(TERSE)],
      ["custom-short", formatConfigurationFiles({ ...TERSE, id: "custom-short", name: "Short" })],
    ])

    expect(storedConfigurationsOf(folders).map((configuration) => configuration.id)).toStrictEqual(["custom-short", "custom-terse"])
  })
})

describe("planFileChanges", () => {
  it("writes every file of a new configuration", () => {
    expect(planFileChanges(new Map(), [TERSE]).writtenFiles.map((file) => file.fileName)).toStrictEqual([
      "configuration.json",
      "context.md",
      "walkthrough.files.waypoints.findings.kind.bug.md",
    ])
  })

  it("writes only the changed files and removes the instruction of a reset field", () => {
    const changed = { ...TERSE, instructions: { context: "One sentence." } }

    expect(planFileChanges(new Map([[TERSE.id, formatConfigurationFiles(TERSE)]]), [changed])).toStrictEqual({
      writtenFiles: [{ folder: "custom-terse", fileName: "context.md", text: "One sentence." }],
      removedFiles: [{ folder: "custom-terse", fileName: "walkthrough.files.waypoints.findings.kind.bug.md" }],
      removedFolders: [],
    })
  })

  it("removes the folder of a deleted configuration and keeps a folder that holds no configuration", () => {
    const folders = new Map([
      [TERSE.id, formatConfigurationFiles(TERSE)],
      ["notes", new Map([["context.md", "Two sentences."]])],
    ])

    expect(planFileChanges(folders, [])).toStrictEqual({ writtenFiles: [], removedFiles: [], removedFolders: ["custom-terse"] })
  })
})
