import { rowSpanOf } from "@/code/lines"
import type { SourceFile, SourceLine } from "@flightplan/configurations"

const REWRITTEN_LINE_COUNT = 20_000

const removedLine = (text: string): SourceLine => ({ text, mark: "removed", number: null })

const keptLine = (text: string, number: number): SourceLine => ({ text, mark: "context", number })

const addedLine = (text: string, number: number): SourceLine => ({ text, mark: "added", number })

const sourceOf = (lines: readonly SourceLine[]): SourceFile => ({
  path: "src/price.ts",
  language: "typescript",
  lines,
  declarations: {},
  references: [],
  languageReferences: [],
  exports: [],
})

describe("rowSpanOf", () => {
  it("starts a range at the removed rows right above it and ends it at its last row", () => {
    const source = sourceOf([
      keptLine("one", 1),
      removedLine("old two"),
      removedLine("old three"),
      addedLine("new two", 2),
      keptLine("three", 3),
      removedLine("old five"),
      keptLine("four", 4),
    ])

    expect(rowSpanOf(source, { lineStart: 2, lineEnd: 3 })).toStrictEqual({ start: 1, end: 4 })
    expect(rowSpanOf(source, { lineStart: 1, lineEnd: 1 })).toStrictEqual({ start: 0, end: 0 })
    expect(rowSpanOf(source, { lineStart: 9, lineEnd: 9 })).toBeNull()
  })

  it("reaches back over every removed row of a file rewritten in place", () => {
    const removed = Array.from({ length: REWRITTEN_LINE_COUNT }, (_line, index) => removedLine(`old ${String(index)}`))
    const added = Array.from({ length: REWRITTEN_LINE_COUNT }, (_line, index) => addedLine(`new ${String(index)}`, index + 1))
    const source = sourceOf([...removed, ...added])

    expect(rowSpanOf(source, { lineStart: 1, lineEnd: REWRITTEN_LINE_COUNT })).toStrictEqual({ start: 0, end: REWRITTEN_LINE_COUNT * 2 - 1 })
  })
})
