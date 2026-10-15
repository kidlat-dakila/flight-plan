import { CART_PATH, cartSource, createCodeBlock, highlightPlainly, linkToFixtureForge, PRICE_PATH, priceSource } from "@/__tests__/review-fixture"
import { buildCodeDefinitions } from "@/code/definitions"
import { codeLinesIn, definitionIdOf, rowSpanOf, usageLineKeyOf, usagesDefinitionIdOf } from "@/code/lines"
import type { CodeDefinition, CodeExport, CodeReference, ContextCodeBlock } from "@flightplan/configurations"

const RATES = { specifier: "./rates", name: "rates" }
const toRates: CodeReference = { line: 12, startColumn: 2, endColumn: 7, path: PRICE_PATH, lines: [1, 1], isLibrary: true, library: RATES }
const stringUse = { line: 14, startColumn: 41, endColumn: 47, name: "String" }
const toCents: CodeReference = { line: 14, startColumn: 55, endColumn: 60, path: PRICE_PATH, lines: [3, 3], isLibrary: false }
const toNowhere: CodeReference = { line: 14, startColumn: 13, endColumn: 19, path: "src/gone.ts", lines: [1, 2], isLibrary: false }
const toPriceOf: CodeReference = { line: 3, startColumn: 6, endColumn: 11, path: PRICE_PATH, lines: [11, 12], isLibrary: false }
const CHECKOUT_PATH = "src/checkout.ts"
const ORDER_PATH = "src/order.ts"
const CHECKOUT_LINE = "  const total = priceOf(sku) + priceOf(extra)"
const exportedPriceOf: CodeExport = {
  line: 11,
  startColumn: 13,
  endColumn: 20,
  lines: [11, 12],
  usages: [
    { line: 4, startColumn: 16, endColumn: 23, path: CHECKOUT_PATH, text: CHECKOUT_LINE },
    { line: 4, startColumn: 32, endColumn: 39, path: CHECKOUT_PATH, text: CHECKOUT_LINE },
    { line: 9, startColumn: 2, endColumn: 9, path: ORDER_PATH, text: "  priceOf(order.sku)" },
  ],
}
const exportedFormat: CodeExport = { line: 14, startColumn: 13, endColumn: 19, lines: [14, 14], usages: [] }
const CHECKOUT_TOKENS = [{ text: CHECKOUT_LINE, kind: "plain" as const }]

const referencing = {
  ...highlightPlainly({
    ...priceSource,
    references: [toRates, toPriceOf, toCents, toNowhere],
    languageReferences: [stringUse],
    exports: [exportedPriceOf, exportedFormat],
  }),
  usageTokenLines: new Map([[usageLineKeyOf({ path: CHECKOUT_PATH, line: 4 }), CHECKOUT_TOKENS]]),
}
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

type DeclarationDefinition = Extract<CodeDefinition, { kind: "declaration" }>

type UsagesDefinition = Extract<CodeDefinition, { kind: "usages" }>

const declarationIn = (built: Readonly<Record<string, CodeDefinition>>, id: string): DeclarationDefinition => {
  const definition = built[id]
  if (definition.kind !== "declaration") throw new Error(`${id} is not a declaration`)
  return definition
}

const usagesIn = (built: Readonly<Record<string, CodeDefinition>>, id: string): UsagesDefinition => {
  const definition = built[id]
  if (definition.kind !== "usages") throw new Error(`${id} has no usages`)
  return definition
}

const linesOf = (lineStart: number, lineEnd: number) => {
  const span = rowSpanOf(referencing.source, { lineStart, lineEnd })
  return span === null ? [] : codeLinesIn(referencing, span, null, { marks: [{ line: 14, startColumn: 13, endColumn: 19 }], definitionIds })
}

describe("buildCodeDefinitions", () => {
  it("gives each definition a reference leads to its file, its range, its lines and the link, and notes a library", () => {
    expect(definitions[definitionIdOf(toRates)]).toMatchObject({
      pathLabel: PRICE_PATH,
      rangeLabel: "Line 1",
      note: "Library. The import is shown and not followed.",
      forgeLink: linkToFixtureForge(PRICE_PATH, { lineStart: 1, lineEnd: 1 }),
    })
    expect(declarationIn(definitions, definitionIdOf(toRates)).lines.map((line) => line.numberLabel)).toStrictEqual(["1"])
    expect(definitions[definitionIdOf(toCents)].note).toBeNull()
  })

  it("gives a definition the description written for the code block on its lines, with its code links", () => {
    expect(declarationIn(definitions, definitionIdOf(toCents)).description).toStrictEqual([
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
    expect(declarationIn(definitions, definitionIdOf(toRates)).description).toBeNull()
  })

  it("gives a name of the language a definition of its own, with the description and no code, only where one is written", () => {
    expect(withLibraryDescribed["language:String"]).toStrictEqual({
      kind: "declaration",
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
    const [format] = span === null ? [] : codeLinesIn(referencing, span, null, { marks: [], definitionIds: new Set(Object.keys(withLibraryDescribed)) })

    expect(format.references).toContainEqual({ fromColumn: 42, toColumn: 47, definitionId: "language:String" })
  })

  it("gives the name of a library the description written for that name, and not the code on the same lines", () => {
    expect(declarationIn(withLibraryDescribed, definitionIdOf(toRates)).description).toStrictEqual([
      { kind: "paragraph", inlines: [{ kind: "code", text: "rates" }, { kind: "text", text: " is the table of prices of the rates library." }] },
    ])
    expect(declarationIn(withLibraryDescribed, definitionIdOf(toCents)).description).toBeNull()
  })

  it("leaves out a definition in a file that has no source", () => {
    expect(Object.keys(definitions)).not.toContain(definitionIdOf(toNowhere))
  })

  it("draws the lines of a definition with no references of their own", () => {
    const declarations = Object.values(definitions).flatMap((definition) => (definition.kind === "declaration" ? [definition] : []))

    expect(declarations.flatMap((definition) => definition.lines.flatMap((line) => line.references))).toStrictEqual([])
  })

  it("draws only the lines of the code block a reference leads to, without the removed lines above it", () => {
    const priceOf = declarationIn(definitions, definitionIdOf(toPriceOf))

    expect(priceOf.rangeLabel).toBe("Lines 11 to 12, 2 lines")
    expect(priceOf.lines.map((line) => [line.mark, line.numberLabel])).toStrictEqual([["added", "11"], ["added", "12"]])
  })

  it("gives an exported name its usages, by file and by line, with each usage marked", () => {
    const usages = usagesIn(definitions, usagesDefinitionIdOf(PRICE_PATH, exportedPriceOf.lines))

    expect(usages).toMatchObject({ nameLabel: "priceOf", countLabel: "3 usages in 2 files", note: null })
    expect(usages.files.map((file) => [file.pathLabel, file.lines.map((line) => [line.numberLabel, line.marks])])).toStrictEqual([
      [CHECKOUT_PATH, [["4", [{ fromColumn: 17, toColumn: 23 }, { fromColumn: 33, toColumn: 39 }]]]],
      [ORDER_PATH, [["9", [{ fromColumn: 3, toColumn: 9 }]]]],
    ])
    expect(usages.files[0].forgeLink).toStrictEqual(linkToFixtureForge(CHECKOUT_PATH, { lineStart: 4, lineEnd: 4 }))
  })

  it("draws a usage line with the tokens highlighted for it", () => {
    const usages = usagesIn(definitions, usagesDefinitionIdOf(PRICE_PATH, exportedPriceOf.lines))

    expect(usages.files[0].lines[0].tokens).toStrictEqual(CHECKOUT_TOKENS)
  })

  it("says an export nobody imports has no usages", () => {
    expect(usagesIn(definitions, usagesDefinitionIdOf(PRICE_PATH, exportedFormat.lines))).toStrictEqual({
      kind: "usages",
      nameLabel: "format",
      countLabel: "No usages",
      files: [],
      note: "No file imports it.",
    })
  })
})

describe("codeLinesIn", () => {
  it("gives a line its references in columns that start at one and end on the last character", () => {
    const [format] = linesOf(14, 14)

    expect(format.references).toContainEqual({ fromColumn: 56, toColumn: 60, definitionId: definitionIdOf(toCents) })
  })

  it("puts a reference whose definition is on the lines shown, and leaves out one whose definition is not known", () => {
    const lines = linesOf(3, 14)

    expect(lines.flatMap((line) => line.references.map((reference) => reference.definitionId))).toContain(definitionIdOf(toPriceOf))
    expect(lines.flatMap((line) => line.references.map((reference) => reference.definitionId))).not.toContain(definitionIdOf(toNowhere))
  })

  it("puts the usages of an exported name on its name", () => {
    const [priceOf] = linesOf(11, 11).filter((line) => line.numberLabel === "11")

    expect(priceOf.references).toStrictEqual([{ fromColumn: 14, toColumn: 20, definitionId: usagesDefinitionIdOf(PRICE_PATH, [11, 12]) }])
  })

  it("gives a line the marks on it", () => {
    const [format] = linesOf(14, 14)

    expect(format.marks).toStrictEqual([{ fromColumn: 14, toColumn: 19 }])
  })

  it("gives no marks and no references to lines drawn without decorations", () => {
    const span = rowSpanOf(referencing.source, { lineStart: 12, lineEnd: 14 })
    const lines = span === null ? [] : codeLinesIn(referencing, span, null)

    expect(lines.flatMap((line) => [...line.marks, ...line.references])).toStrictEqual([])
  })
})
