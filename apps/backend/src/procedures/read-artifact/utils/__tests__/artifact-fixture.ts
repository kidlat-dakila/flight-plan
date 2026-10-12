import type { ProcedureContext } from "@/procedures/context"
import { createConversationContext, KEY, STARTED_AT } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { mockJourney } from "@/procedures/get-review/utils/mocks/mock-journey"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { parseMarkedSource } from "@flightplan/codegraph"
import type { ReviewArtifact, Segment, SourceFile, Waypoint, PresetName } from "@flightplan/configurations"

export const SUBTOTAL_PATH = "src/cart/subtotal.ts"
export const PRICE_PATH = "src/catalog/price.ts"
export const TEST_PATH = "src/cart/__tests__/subtotal.spec.ts"

const SUBTOTAL = [
  " import { priceOf } from \"../catalog/price\"",
  " ",
  "#region lineTotal",
  " const lineTotal = (sku: string, units: number): number =>",
  "-  Math.round(priceOf(sku) * units * 100) / 100",
  "+  priceOf(sku) * units",
  "#endregion lineTotal",
  " ",
  "#region subtotal",
  " export const subtotal = (cart: Cart): number =>",
  "+  Math.round(",
  "+    cart.lines.reduce((total, line) => total + lineTotal(line.sku, line.units), 0) * 100,",
  "+  ) / 100",
  "#endregion subtotal",
].join("\n")

const PRICE = [
  "#region priceOf",
  " export const priceOf = (sku: string): number =>",
  "+  PRICES[sku] ?? 0",
  "#endregion priceOf",
].join("\n")

const unwrittenWaypoint = (id: string, declaration: string): Waypoint => ({
  id,
  title: null,
  declaration,
  codeBlocks: [],
  reading: "",
  needsAttention: null,
  findings: [],
  children: [],
})

const DRAFT_SOURCES: readonly SourceFile[] = [
  parseMarkedSource(PRICE_PATH, "typescript", PRICE),
  parseMarkedSource(SUBTOTAL_PATH, "typescript", SUBTOTAL),
]

export const DRAFT_JOURNEY_NODE = { id: "j-subtotal", type: "function", path: SUBTOTAL_PATH, declaration: "subtotal", isChanged: true, label: null, description: null } as const

export const draftJourneyOf = (nodes: Parameters<typeof mockJourney>[1]): ReturnType<typeof mockJourney> => mockJourney(DRAFT_SOURCES, nodes, [])

export const DRAFT_SEGMENT: Segment = {
  id: "all",
  title: "Move price rounding into the cart total",
  changedPaths: [SUBTOTAL_PATH, PRICE_PATH, TEST_PATH],
  context: "",
  journey: draftJourneyOf([DRAFT_JOURNEY_NODE]),
  blast: {
    nodes: [
      { path: "src/cart/CartPage.tsx", diffType: null, impactType: null, impactReason: null },
      { path: "src/cart/CartTotal.tsx", diffType: null, impactType: null, impactReason: null },
      { path: SUBTOTAL_PATH, diffType: "modified", impactType: null, impactReason: null },
    ],
    edges: [
      { importer: "src/cart/CartTotal.tsx", imported: SUBTOTAL_PATH },
      { importer: "src/cart/CartPage.tsx", imported: "src/cart/CartTotal.tsx" },
    ],
  },
  walkthrough: {
    intro: null,
    files: [
      { path: PRICE_PATH, title: PRICE_PATH, summary: [], waypoints: [unwrittenWaypoint("w1", "priceOf")] },
      {
        path: SUBTOTAL_PATH,
        title: SUBTOTAL_PATH,
        summary: [],
        waypoints: [unwrittenWaypoint("w2", "lineTotal"), unwrittenWaypoint("w3", "subtotal")],
      },
    ],
  },
}

export const DRAFT_ARTIFACT: ReviewArtifact = {
  title: "Move price rounding into the cart total",
  status: "drafting",
  commit: "c81e220",
  isSegmented: false,
  segments: [DRAFT_SEGMENT],
  sources: DRAFT_SOURCES,
  changedPaths: [SUBTOTAL_PATH, PRICE_PATH, TEST_PATH],
}

export const WALKTHROUGH_ONLY_SEGMENT: Segment = {
  ...DRAFT_SEGMENT,
  journey: null,
  blast: null,
}

export const WALKTHROUGH_ONLY_ARTIFACT: ReviewArtifact = { ...DRAFT_ARTIFACT, segments: [WALKTHROUGH_ONLY_SEGMENT] }

export const TWO_SEGMENT_ARTIFACT: ReviewArtifact = {
  ...DRAFT_ARTIFACT,
  isSegmented: true,
  segments: [
    { ...WALKTHROUGH_ONLY_SEGMENT, id: "first" },
    { ...WALKTHROUGH_ONLY_SEGMENT, id: "second" },
  ],
}

export const createArtifactContext = async (
  artifact: ReviewArtifact | null = DRAFT_ARTIFACT,
  preset: PresetName = "standard",
): Promise<ProcedureContext> => {
  const reviewStore = new InMemoryReviewStore([])
  if (artifact !== null) {
    await reviewStore.writeScaffold(KEY, {
      artifact,
      baseCommit: "0000000",
      request: { preset, order: "foundations-first", customOrder: null, writer: { kind: "manual" }, requestedAt: STARTED_AT },
    })
  }
  return { ...createConversationContext().context, reviewStore }
}

export const messageOf = (outcome: object): string =>
  "message" in outcome && typeof outcome.message === "string" ? outcome.message : ""

export const SEGMENT_KEY = { ...KEY, segmentId: "all" } as const

export { KEY }
