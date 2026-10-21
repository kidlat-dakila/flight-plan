import { instructionReaderOf, instructionTextsOf } from "@/procedures/get-instructions/utils/instruction-texts"

const BUNDLED_FILES = {
  "../packages/configurations/src/system-instructions/title.md": "What the title is.",
  "../packages/configurations/src/system-instructions/context.md": "What the context is.",
  "../packages/configurations/src/default-configurations/standard/context.md": "How Standard writes the context.",
  "../packages/configurations/src/default-configurations/minimal/context.md": "How Minimal writes the context.",
  "../packages/configurations/src/default-configurations/minimal/walkthrough.files.waypoints.reading.md": "How Minimal writes a reading.",
  "../packages/configurations/src/default-configurations/standard/notes.txt": "Not an instruction.",
}

describe("instructionTextsOf", () => {
  it("keys the system instructions and each preset's instructions by file name", () => {
    const texts = instructionTextsOf(BUNDLED_FILES)

    expect(texts.system).toStrictEqual(new Map([["title", "What the title is."], ["context", "What the context is."]]))
    expect(texts.presets).toStrictEqual(
      new Map([
        ["standard", new Map([["context", "How Standard writes the context."]])],
        ["minimal", new Map([["context", "How Minimal writes the context."], ["walkthrough.files.waypoints.reading", "How Minimal writes a reading."]])],
      ]),
    )
  })

  it("gives no instructions for no files", () => {
    expect(instructionTextsOf({})).toStrictEqual({ system: new Map(), presets: new Map() })
  })
})

describe("instructionReaderOf", () => {
  it("reads back the texts it was given", async () => {
    const texts = instructionTextsOf(BUNDLED_FILES)

    expect(await instructionReaderOf(texts)()).toBe(texts)
  })
})
