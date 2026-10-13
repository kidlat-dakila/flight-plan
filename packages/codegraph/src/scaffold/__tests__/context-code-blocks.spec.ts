import { buildStoredCodeGroupGraph, linkCodeGroupGraph } from "@/code-blocks"
import { generateWalkthroughFromBlocks } from "@/code-walkthrough/from-blocks"
import { generateJourneyFlowDiagram } from "@/journey-flow-diagram"
import { listContextCodeBlocks, type ViewedSegment } from "@/scaffold/context-code-blocks"

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

const viewedSegment = (): ViewedSegment => {
  const group = linkCodeGroupGraph(buildStoredCodeGroupGraph([
    sourceOf(CHECKOUT_PATH, CHECKOUT_LINES, { "./pricing": PRICING_PATH }, []),
    sourceOf(PRICING_PATH, PRICING_LINES, {}, [CHECKOUT_PATH]),
    sourceOf(UNUSED_PATH, UNUSED_LINES, {}, []),
  ]))
  const journey = generateJourneyFlowDiagram({ group, importGraphGroup: [], scope: null })
  return { journey: null, walkthrough: generateWalkthroughFromBlocks({ group, filePaths: [CHECKOUT_PATH], journeyFlowDiagram: journey, firstWaypointNumber: 1 }) }
}

const listed = listContextCodeBlocks([viewedSegment()])
const placesOf = (): string[] => listed.map(({ codeBlock }) => `${codeBlock.astGraph.filePath} ${codeBlock.name ?? codeBlock.type}`)

describe("listContextCodeBlocks", () => {
  it("lists every declaration at the top level of a file the review shows, and every block of another file it uses", () => {
    expect(placesOf()).toStrictEqual([`${CHECKOUT_PATH} TAX_RATE`, `${CHECKOUT_PATH} subtotal`, `${PRICING_PATH} priceOf`])
  })

  it("lists no import, no library and no block of a file the review does not show or use", () => {
    expect(listed.map(({ codeBlock }) => codeBlock.type)).not.toContain("import")
    expect(placesOf().filter((place) => place.startsWith(UNUSED_PATH) || place.includes("zod") || place.includes("RATES"))).toStrictEqual([])
  })

  it("lists a block once, however many segments show it, with no description and not required", () => {
    const twice = listContextCodeBlocks([viewedSegment(), viewedSegment()])

    expect(new Set(twice.map(({ codeBlock }) => codeBlock.id)).size).toBe(twice.length)
    expect(listed.every(({ isRequired, description }) => !isRequired && description === null)).toBe(true)
  })
})
