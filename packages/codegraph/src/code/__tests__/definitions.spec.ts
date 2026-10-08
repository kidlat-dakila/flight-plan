import { cartSource, highlightPlainly, linkToFixtureForge, PRICE_PATH, priceSource } from "@/__tests__/review-fixture"
import { buildCodeDefinitions } from "@/code/definitions"
import { codeLinesIn, definitionIdOf, rowSpanOf } from "@/code/lines"
import type { CodeReference } from "@flightplan/configurations"

const toRates: CodeReference = { line: 12, startColumn: 2, endColumn: 7, path: PRICE_PATH, lines: [1, 1], isLibrary: true }
const toCents: CodeReference = { line: 14, startColumn: 55, endColumn: 60, path: PRICE_PATH, lines: [3, 3], isLibrary: false }
const toNowhere: CodeReference = { line: 14, startColumn: 13, endColumn: 19, path: "src/gone.ts", lines: [1, 2], isLibrary: false }

const referencing = highlightPlainly({ ...priceSource, references: [toRates, toCents, toNowhere] })
const sources = [referencing, highlightPlainly(cartSource)]
const definitions = buildCodeDefinitions(sources, linkToFixtureForge)
const definitionIds = new Set(Object.keys(definitions))

const linesOf = (lineStart: number, lineEnd: number, shownLines: readonly (readonly [number, number])[]) => {
  const span = rowSpanOf(referencing.source, { lineStart, lineEnd })
  return span === null ? [] : codeLinesIn(referencing, span, null, { marks: [{ line: 14, startColumn: 13, endColumn: 19 }], shownLines: shownLines.map(([start, end]) => [start, end]), definitionIds })
}

describe("buildCodeDefinitions", () => {
  it("gives each definition a reference leads to its file, its range, its lines and the link, and notes a library", () => {
    expect(definitions[definitionIdOf(toRates)]).toMatchObject({
      pathLabel: PRICE_PATH,
      rangeLabel: "Line 1",
      note: "Library. The import is shown and not followed.",
      forgeLink: linkToFixtureForge(PRICE_PATH, { lineStart: 1, lineEnd: 1 }),
    })
    expect(definitions[definitionIdOf(toRates)].lines.map((line) => line.numberLabel)).toStrictEqual(["1"])
    expect(definitions[definitionIdOf(toCents)].note).toBeNull()
  })

  it("leaves out a definition in a file that has no source", () => {
    expect(Object.keys(definitions)).not.toContain(definitionIdOf(toNowhere))
  })

  it("draws the lines of a definition with no references of their own", () => {
    expect(Object.values(definitions).flatMap((definition) => definition.lines.flatMap((line) => line.references))).toStrictEqual([])
  })
})

describe("codeLinesIn", () => {
  it("gives a line its references in columns that start at one and end on the last character", () => {
    const [format] = linesOf(14, 14, [[14, 14]])

    expect(format.references).toStrictEqual([{ fromColumn: 56, toColumn: 60, definitionId: definitionIdOf(toCents) }])
  })

  it("leaves out a reference whose definition is on the lines shown, and one whose definition is not known", () => {
    const [format] = linesOf(14, 14, [[3, 3], [14, 14]])

    expect(format.references).toStrictEqual([])
  })

  it("gives a line the marks on it", () => {
    const [format] = linesOf(14, 14, [[14, 14]])

    expect(format.marks).toStrictEqual([{ fromColumn: 14, toColumn: 19 }])
  })

  it("gives no marks and no references to lines drawn without decorations", () => {
    const span = rowSpanOf(referencing.source, { lineStart: 12, lineEnd: 14 })
    const lines = span === null ? [] : codeLinesIn(referencing, span, null)

    expect(lines.flatMap((line) => [...line.marks, ...line.references])).toStrictEqual([])
  })
})
