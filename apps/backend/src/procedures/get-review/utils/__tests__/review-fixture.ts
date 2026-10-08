import { parseMarkedSource, type HighlightedSource } from "@flightplan/codegraph"
import type { DeclarationNode, ReviewArtifact, Segment, SourceFile, Waypoint } from "@flightplan/configurations"

export const PRICE_PATH = "src/price.ts"
export const CART_PATH = "src/cart.ts"

const PRICE_SOURCE_TEXT = [
  " import { rates } from \"./rates\"",
  " ",
  " const CENTS = 100",
  " ",
  " const unused = 1",
  " const alsoUnused = 2",
  " const stillUnused = 3",
  " const neverUsed = 4",
  " const idle = 5",
  " ",
  "#region priceOf",
  "-export const priceOf = (sku: string) => rates[sku]",
  "+export const priceOf = (sku: string, held = 0) =>",
  "+  rates[sku] - held",
  "#endregion priceOf",
  " ",
  "#region format",
  " export const format = (price: number) => String(price / CENTS)",
  "#endregion format",
].join("\n")

const CART_SOURCE_TEXT = [
  "#region subtotal",
  " export const subtotal = (skus: string[]) =>",
  "+  skus.reduce((total, sku) => total + priceOf(sku), 0)",
  "#endregion subtotal",
].join("\n")

export const priceSource: SourceFile = parseMarkedSource(PRICE_PATH, "typescript", PRICE_SOURCE_TEXT)
export const cartSource: SourceFile = parseMarkedSource(CART_PATH, "typescript", CART_SOURCE_TEXT)

export const highlightPlainly = (source: SourceFile): HighlightedSource => ({
  source,
  tokenLines: source.lines.map((line) => (line.text === "" ? [] : [{ text: line.text, kind: "plain" as const }])),
})

export const fixtureSources: readonly HighlightedSource[] = [highlightPlainly(priceSource), highlightPlainly(cartSource)]

export const createWaypoint = (id: string, declaration: string, overrides: Partial<Waypoint> = {}): Waypoint => ({
  id,
  title: `Waypoint ${id}`,
  declaration,
  reading: "Explains the change.",
  needsAttention: null,
  findings: [],
  children: [],
  ...overrides,
})

export const createDeclarationNode = (id: string, overrides: Partial<DeclarationNode> = {}): DeclarationNode => ({
  kind: "declaration",
  id,
  path: PRICE_PATH,
  declaration: "priceOf",
  changeType: "related",
  isAdded: false,
  category: "logic",
  label: id,
  description: null,
  tracedLines: [],
  events: [],
  data: [],
  ...overrides,
})

export const createSegment = (overrides: Partial<Segment> = {}): Segment => ({
  id: "all",
  title: "Everything",
  changedPaths: [PRICE_PATH, CART_PATH],
  context: "Why it matters.",
  journey: null,
  journeyAbsence: null,
  blast: null,
  blastAbsence: null,
  walkthrough: {
    intro: null,
    files: [
      {
        path: PRICE_PATH,
        title: "Price file",
        summary: [],
        waypoints: [createWaypoint("price-of", "priceOf"), createWaypoint("format", "format")],
      },
      { path: CART_PATH, title: "Cart file", summary: [], waypoints: [createWaypoint("subtotal", "subtotal")] },
    ],
  },
  ...overrides,
})

export const createArtifact = (overrides: Partial<ReviewArtifact> = {}): ReviewArtifact => ({
  title: "Count held units",
  status: "complete",
  commit: "abc1234",
  isSegmented: false,
  segments: [createSegment()],
  sources: [priceSource, cartSource],
  changedPaths: [PRICE_PATH, CART_PATH],
  ...overrides,
})
