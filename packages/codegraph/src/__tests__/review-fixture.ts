import type { HighlightedSource } from "@/code/lines"
import { parseMarkedSource } from "@/code/marked-source"
import type { BlobLinker, ReviewViewContext } from "@/review-view-context"
import type {
  CodeBlock,
  Finding,
  TraceDiagram,
  TraceNode,
  TraceNodeEdge,
  ReviewArtifact,
  Segment,
  SourceFile,
  Waypoint,
} from "@flightplan/configurations"

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
  usageTokenLines: new Map(),
})

export const fixtureSources: readonly HighlightedSource[] = [highlightPlainly(priceSource), highlightPlainly(cartSource)]

export const createFinding = (id: string, kind: Finding["kind"], overrides: Partial<Finding> = {}): Finding => ({
  id,
  kind,
  title: `Finding ${id}`,
  reading: "It reads the wrong rate.",
  trace: null,
  solution: null,
  ...overrides,
})

export const createWaypoint = (id: string, declaration: string, overrides: Partial<Waypoint> = {}): Waypoint => ({
  id,
  title: `Waypoint ${id}`,
  declaration,
  codeBlocks: [],
  reading: "Explains the change.",
  coreChange: null,
  findings: [],
  children: [],
  isRequired: false,
  ...overrides,
})

const FIRST_POSITION = { line: 1, column: 1 }

export const createCodeBlock = (id: string, filePath: string, overrides: Partial<CodeBlock> = {}): CodeBlock => ({
  id,
  name: "priceOf",
  type: "function",
  lineOfCodeRangeReference: [{ start: FIRST_POSITION, end: FIRST_POSITION }],
  parentBlock: null,
  childrenBlocks: [],
  isRoot: true,
  isExported: true,
  exportedBy: [],
  lineOfCodeDiffs: null,
  diffs: [],
  diffSources: [],
  classifications: ["logic"],
  diffClassifications: [],
  outerSymbols: [],
  usedBy: [],
  nextBlocks: [],
  handedFrom: [],
  astGraph: { filePath, codeBlocks: [], rootBlocks: [], diffBlocks: [], diffContains: [], externalSymbols: [], externalBlocks: [], exports: new Map() },
  catalogue: null,
  ...overrides,
})

export const createTraceNode = (id: string, overrides: Partial<TraceNode> = {}): TraceNode => ({
  id,
  type: "function",
  label: id,
  description: null,
  codeBlocks: [createCodeBlock(id, PRICE_PATH)],
  diffCodeBlocks: [],
  children: [],
  triggerLabels: [],
  blockLabels: [],
  isRequired: false,
  ...overrides,
})

export const createTrace = (traceNodes: readonly TraceNode[], traceNodeEdges: readonly TraceNodeEdge[] = []): TraceDiagram => ({
  astCodeGroup: { astGraphs: [], rootASTGraphs: [], codeBlocks: [], diffBlocks: [], diffContains: [], chainContains: [], diffChains: [] },
  importGraphGroup: [],
  title: null,
  description: null,
  traceNodes,
  traceNodeEdges,
  isRequired: false,
})

export const createSegment = (overrides: Partial<Segment> = {}): Segment => ({
  id: "all",
  title: "Everything",
  changedPaths: [PRICE_PATH, CART_PATH],
  context: "Why it matters.",
  traceDiagram: null,
  blastDiagram: null,
  isContextRequired: false,
  walkthrough: {
    files: [
      {
        path: PRICE_PATH,
        waypoints: [createWaypoint("price-of", "priceOf"), createWaypoint("format", "format")],
      },
      { path: CART_PATH, waypoints: [createWaypoint("subtotal", "subtotal")] },
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
  contextCodeBlocks: [],
  changedPaths: [PRICE_PATH, CART_PATH],
  ...overrides,
})

export const linkToFixtureForge: BlobLinker = (path, range) => ({
  href: `https://forge.test/${path}${range === null ? "" : `#L${String(range.lineStart)}-L${String(range.lineEnd)}`}`,
  label: "Open on the forge",
})

export const createViewContext = (knownLinkIds: readonly string[] = []): ReviewViewContext => ({
  sources: fixtureSources,
  solutionTokens: new Map(),
  knownLinkIds: new Set(knownLinkIds),
  definitionIds: new Set(),
  blobLinkOf: linkToFixtureForge,
  spotlight: [],
  walkthroughOrder: "imports-bottom-up",
  isWriting: false,
})
