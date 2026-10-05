import { parseMarkedSource } from "@/procedures/get-review/utils/mocks/marked-source"

const MARKED_TEXT = [" const a = 1", "#region b", "-const b = 2", "+const b = 3", "+const c = 4", "#endregion b"].join("\n")

describe("parseMarkedSource", () => {
  it("reads the mark of each line and numbers the lines that exist after the change", () => {
    const source = parseMarkedSource("src/a.ts", "typescript", MARKED_TEXT)

    expect(source.lines).toStrictEqual([
      { text: "const a = 1", mark: "context", number: 1 },
      { text: "const b = 2", mark: "removed", number: null },
      { text: "const b = 3", mark: "added", number: 2 },
      { text: "const c = 4", mark: "added", number: 3 },
    ])
  })

  it("records each region as a declaration with its line range", () => {
    const source = parseMarkedSource("src/a.ts", "typescript", MARKED_TEXT)

    expect(source.declarations).toStrictEqual({ b: { lineStart: 2, lineEnd: 3 } })
  })
})
