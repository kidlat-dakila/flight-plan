import { CART_PATH, cartSource, createCodeBlock, highlightPlainly, linkToFixtureForge, PRICE_PATH, priceSource } from "@/__tests__/review-fixture"
import { buildCodeDefinitions } from "@/code/definitions"
import { codeLinesIn, definitionIdOf, rowSpanOf } from "@/code/lines"
import type { CodeReference, ContextCodeBlock } from "@flightplan/configurations"

const RATES = { specifier: "./rates", name: "rates" }
const toRates: CodeReference = { line: 12, startColumn: 2, endColumn: 7, path: PRICE_PATH, lines: [1, 1], isLibrary: true, library: RATES }
const stringUse = { line: 14, startColumn: 41, endColumn: 47, name: "String" }
const toCents: CodeReference = { line: 14, startColumn: 55, endColumn: 60, path: PRICE_PATH, lines: [3, 3], isLibrary: false }
const toNowhere: CodeReference = { line: 14, startColumn: 13, endColumn: 19, path: "src/gone.ts", lines: [1, 2], isLibrary: false }

const referencing = highlightPlainly({ ...priceSource, references: [toRates, toCents, toNowhere], languageReferences: [stringUse] })
const sources = [referencing, highlightPlainly(cartSource)]
const CENTS_LINE = { start: { line: 3, column: 1 }, end: { line: 3, column: 18 } }
const SUBTOTAL_LINK_ID = `${CART_PATH}#subtotal`
const describedCents: ContextCodeBlock = {
  isRequired: true,
  kind: "codebase",
  specifier: null,
  name: null,
  codeBlock: createCodeBlock("cents", PRICE_PATH, { name: "CENTS", lineOfCodeRangeReference: [CENTS_LINE] }),
  description: "`CENTS` is a constant. It is used in [`subtotal()`](code:src/cart.ts#subtotal).",
}
const describedRates: ContextCodeBlock = {
  isRequired: true,
  kind: "library",
  codeBlock: null,
  specifier: RATES.specifier,
  name: RATES.name,
  description: "`rates` is the table of prices of the rates library.",
}
const describedString: ContextCodeBlock = {
  isRequired: true,
  kind: "language",
  codeBlock: null,
  specifier: null,
  name: "String",
  description: "`String(value)` turns a value into text.",
}
const undescribed: ContextCodeBlock = { isRequired: true, kind: "codebase", specifier: null, name: null, codeBlock: createCodeBlock("rates", PRICE_PATH), description: null }
const definitions = buildCodeDefinitions(sources, linkToFixtureForge, {
  contextCodeBlocks: [describedCents, undescribed],
  knownLinkIds: new Set([SUBTOTAL_LINK_ID]),
})
const withLibraryDescribed = buildCodeDefinitions(sources, linkToFixtureForge, {
  contextCodeBlocks: [describedRates, describedString],
  knownLinkIds: new Set([SUBTOTAL_LINK_ID]),
})
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

  it("gives a definition the description written for the code block on its lines, with its code links", () => {
    expect(definitions[definitionIdOf(toCents)].description).toStrictEqual([
      {
        kind: "paragraph",
        inlines: [
          { kind: "code", text: "CENTS" },
          { kind: "text", text: " is a constant. It is used in " },
          { kind: "code-link", text: "subtotal()", isCode: true, linkId: SUBTOTAL_LINK_ID },
          { kind: "text", text: "." },
        ],
      },
    ])
  })

  it("gives no description to a library, nor to a block nobody described", () => {
    expect(definitions[definitionIdOf(toRates)].description).toBeNull()
  })

  it("gives a name of the language a definition of its own, with the description and no code, only where one is written", () => {
    expect(withLibraryDescribed["language:String"]).toStrictEqual({
      pathLabel: "String",
      rangeLabel: "Language",
      description: [{ kind: "paragraph", inlines: [{ kind: "code", text: "String(value)" }, { kind: "text", text: " turns a value into text." }] }],
      lines: [],
      note: "Assumed to be part of the language: this file does not import or declare it.",
      forgeLink: null,
    })
    expect(Object.keys(definitions)).not.toContain("language:String")
  })

  it("puts the reference of a described name of the language on its line", () => {
    const span = rowSpanOf(referencing.source, { lineStart: 14, lineEnd: 14 })
    const [format] = span === null ? [] : codeLinesIn(referencing, span, null, { marks: [], shownLines: [[14, 14]], definitionIds: new Set(Object.keys(withLibraryDescribed)) })

    expect(format.references).toContainEqual({ fromColumn: 42, toColumn: 47, definitionId: "language:String" })
  })

  it("gives the name of a library the description written for that name, and not the code on the same lines", () => {
    expect(withLibraryDescribed[definitionIdOf(toRates)].description).toStrictEqual([
      { kind: "paragraph", inlines: [{ kind: "code", text: "rates" }, { kind: "text", text: " is the table of prices of the rates library." }] },
    ])
    expect(withLibraryDescribed[definitionIdOf(toCents)].description).toBeNull()
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
