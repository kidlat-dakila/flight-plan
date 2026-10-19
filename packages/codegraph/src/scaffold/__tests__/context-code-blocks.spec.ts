import { buildStoredCodeGroupGraph, linkCodeGroupGraph } from "@/code-blocks"
import type { FileCodeReferences } from "@/code-references"
import { generateWalkthroughFromBlocks } from "@/code-walkthrough/from-blocks"
import { contextIdOf, listContextCodeBlocks, type ViewedSegment } from "@/scaffold/context-code-blocks"
import { generateTraceDiagram } from "@/trace-diagram"
import type { CodeReference } from "@flightplan/configurations"

const CHECKOUT_PATH = "src/checkout.ts"
const PRICING_PATH = "src/pricing.ts"
const UNUSED_PATH = "src/unused.ts"

const CHECKOUT_LINES = [
  "import { priceOf } from \"./pricing\"",
  "import { z } from \"zod\"",
  "",
  "export const TAX_RATE = 0.2",
  "",
  "export function subtotal(items: string[]) {",
  "  return items.reduce((sum, item) => sum + priceOf(item), 0)",
  "}",
]

const PRICING_LINES = [
  "const RATES = new Map<string, number>()",
  "",
  "export const priceOf = (sku: string) => RATES.get(sku) ?? 0",
]

const UNUSED_LINES = ["export const idle = 1"]

const CHANGED_LINE = 7

const sourceOf = (filePath: string, lines: readonly string[], importedFilePaths: Readonly<Record<string, string>>, importedBy: readonly string[]) => ({
  filePath,
  source: lines.join("\n"),
  importedBy: [...importedBy],
  importedFilePaths: new Map(Object.entries(importedFilePaths)),
  diffs: filePath === CHECKOUT_PATH
    ? [{ type: "modified" as const, range: { start: { line: CHANGED_LINE, column: 3 }, end: { line: CHANGED_LINE, column: CHECKOUT_LINES[CHANGED_LINE - 1].length + 1 } } }]
    : [],
})

const ZOD_IMPORT_LINE = 2
const ZOD = { specifier: "zod", name: "z" }
const zodUse: CodeReference = { line: CHANGED_LINE, startColumn: 9, endColumn: 10, path: CHECKOUT_PATH, lines: [ZOD_IMPORT_LINE, ZOD_IMPORT_LINE], isLibrary: true, library: ZOD }
const zodUseElsewhere: CodeReference = { line: 1, startColumn: 9, endColumn: 10, path: PRICING_PATH, lines: [9, 9], isLibrary: true, library: ZOD }
const priceOfUse: CodeReference = { line: CHANGED_LINE, startColumn: 46, endColumn: 53, path: PRICING_PATH, lines: [3, 3], isLibrary: false }
const mapUse = { line: 1, startColumn: 18, endColumn: 21, name: "Map" }
const mathUse = { line: CHANGED_LINE, startColumn: 10, endColumn: 14, name: "Math" }

const REFERENCES: readonly FileCodeReferences[] = [
  { path: CHECKOUT_PATH, references: [zodUse, priceOfUse], languageReferences: [mathUse], exports: [] },
  { path: PRICING_PATH, references: [zodUseElsewhere], languageReferences: [mapUse, { ...mathUse, line: 3 }], exports: [] },
]

const viewedSegment = (codeReferences: readonly FileCodeReferences[] = REFERENCES): ViewedSegment => {
  const group = linkCodeGroupGraph(buildStoredCodeGroupGraph([
    sourceOf(CHECKOUT_PATH, CHECKOUT_LINES, { "./pricing": PRICING_PATH }, []),
    sourceOf(PRICING_PATH, PRICING_LINES, {}, [CHECKOUT_PATH]),
    sourceOf(UNUSED_PATH, UNUSED_LINES, {}, []),
  ]))
  const traceDiagram = generateTraceDiagram({ group, importGraphGroup: [], scope: null })
  const walkthrough = generateWalkthroughFromBlocks({ group, filePaths: [CHECKOUT_PATH], traceDiagram, firstWaypointNumber: 1 })
  return { traceDiagram: null, walkthrough, codeReferences }
}

const listed = listContextCodeBlocks([viewedSegment()])
const ofKind = (kind: string) => listed.filter((item) => item.kind === kind)

describe("listContextCodeBlocks", () => {
  it("lists every declaration at the top level of a file the review shows, and every block of another file it uses", () => {
    expect(ofKind("codebase").map(({ codeBlock }) => codeBlock?.name)).toStrictEqual(["TAX_RATE", "subtotal", "priceOf"])
  })

  it("lists a name of a library once, however many files import it, with the import statement of the first", () => {
    expect(ofKind("library")).toMatchObject([{ kind: "library", specifier: "zod", name: "z", isRequired: false, description: null }])
    expect(ofKind("library").map(contextIdOf)).toStrictEqual(["library:zod#z"])
    expect(ofKind("library")[0].codeBlock).toMatchObject({ type: "import", lineOfCodeRangeReference: [{ start: { line: ZOD_IMPORT_LINE } }] })
  })

  it("lists a name the file neither imports nor declares once, as the language's, with no code block", () => {
    expect(ofKind("language")).toStrictEqual([
      { isRequired: false, kind: "language", codeBlock: null, specifier: null, name: "Map", description: null },
      { isRequired: false, kind: "language", codeBlock: null, specifier: null, name: "Math", description: null },
    ])
    expect(ofKind("language").map(contextIdOf)).toStrictEqual(["language:Map", "language:Math"])
  })

  it("lists no import statement as code of the repository, and no block of a file the review does not show or use", () => {
    expect(ofKind("codebase").map(({ codeBlock }) => codeBlock?.type)).not.toContain("import")
    expect(listed.map(contextIdOf).filter((id) => id.startsWith(UNUSED_PATH) || id.includes("RATES"))).toStrictEqual([])
    expect(listContextCodeBlocks([viewedSegment([])]).map((item) => item.kind)).toStrictEqual(["codebase", "codebase", "codebase"])
  })

  it("lists an item once, however many segments show it", () => {
    const twice = listContextCodeBlocks([viewedSegment(), viewedSegment()])

    expect(new Set(twice.map(contextIdOf)).size).toBe(twice.length)
    expect(twice).toHaveLength(listed.length)
  })
})
