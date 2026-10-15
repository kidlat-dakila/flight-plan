import { heldLinesOf, textLinesOf, toCodeLines } from "@/procedures/get-file-code/utils/file-lines"
import type { SourceFile } from "@flightplan/configurations"

const SOURCE: SourceFile = {
  path: "src/price.ts",
  language: "typescript",
  lines: [
    { text: "export const price = 1", mark: "removed", number: null },
    { text: "export const price = 2", mark: "added", number: 1 },
    { text: "export const tax = 0", mark: "context", number: 2 },
  ],
  declarations: {},
  references: [],
  languageReferences: [],
  exports: [],
}

describe("file lines", () => {
  it("reads the file as it is now from a source the Flight Plan holds, leaving out the removed lines", () => {
    expect(heldLinesOf(SOURCE)).toStrictEqual([
      { number: 1, text: "export const price = 2", mark: "added" },
      { number: 2, text: "export const tax = 0", mark: "context" },
    ])
  })

  it("numbers the lines of a text, without an empty line after the last line break", () => {
    expect(textLinesOf("first\n\nthird\n")).toStrictEqual([
      { number: 1, text: "first", mark: "context" },
      { number: 2, text: "", mark: "context" },
      { number: 3, text: "third", mark: "context" },
    ])
    expect(textLinesOf("only")).toStrictEqual([{ number: 1, text: "only", mark: "context" }])
  })

  it("draws each line with its highlighted tokens, and as plain text when it has none", () => {
    const lines = heldLinesOf(SOURCE)

    expect(toCodeLines(lines, [[{ text: "export", kind: "keyword" }]])).toStrictEqual([
      { numberLabel: "1", removedNumberLabel: "", mark: "added", isFocused: false, tokens: [{ text: "export", kind: "keyword" }], marks: [], references: [] },
      { numberLabel: "2", removedNumberLabel: "", mark: "context", isFocused: false, tokens: [{ text: "export const tax = 0", kind: "plain" }], marks: [], references: [] },
    ])
  })
})
