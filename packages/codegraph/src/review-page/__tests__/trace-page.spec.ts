import { CART_PATH, createArtifact, createSegment, createWaypoint, fixtureSources, PRICE_PATH } from "@/__tests__/review-fixture"
import type { HighlightedReview } from "@/code/highlight-review"
import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import type { ViewPreferences } from "@/review-page/review-view"
import { buildTracePage } from "@/review-page/trace-page"
import { presentDiagramOf } from "@/trace-diagram/__tests__/diagram-fixture"
import type { ReviewArtifact } from "@flightplan/configurations"

const PROMO_PATH = "src/promo.ts"
const PROMO = codeOf("export const fetchPromo = (code) => {", "  return code.trim()", "}")
const REDEEM_PATH = "src/redeem.ts"
const REDEEM = codeOf("import { fetchPromo } from \"./promo\"", "", "export const redeem = (code) => fetchPromo(code)")
const promoDiagram = presentDiagramOf({ [PROMO_PATH]: PROMO, [REDEEM_PATH]: REDEEM }, { [PROMO_PATH]: [rangeAt(2, 10, 2, 20)] })

const highlighted: HighlightedReview = { sources: fixtureSources, solutionTokens: new Map() }
const preferences: ViewPreferences = { spotlight: [], walkthroughOrder: "imports-bottom-up" }

const priceSegment = createSegment({
  id: "price",
  title: "Price",
  changedPaths: [PRICE_PATH],
  traceDiagram: promoDiagram,
  walkthrough: { files: [{ path: PRICE_PATH, waypoints: [createWaypoint("price-of", "priceOf")] }] },
})
const cartSegment = createSegment({
  id: "cart",
  title: "",
  changedPaths: [CART_PATH],
  traceDiagram: promoDiagram,
  walkthrough: { files: [{ path: CART_PATH, waypoints: [createWaypoint("subtotal", "subtotal")] }] },
})

const tracePageOf = (overrides: Partial<ReviewArtifact>) =>
  buildTracePage({ artifact: createArtifact(overrides), highlighted, preferences })

describe("buildTracePage", () => {
  it("gives each segment of a review shown in segments its heading and a Trace Diagram scoped to it", () => {
    const page = tracePageOf({ isSegmented: true, segments: [priceSegment, cartSegment] })

    expect(page.segments.map(({ id, heading, traceDiagram }) => [id, heading, traceDiagram.anchorId, traceDiagram.tabs.length])).toStrictEqual([
      ["price", "Segment 1: Price", "price-trace-diagram", 0],
      ["cart", "Segment 2", "cart-trace-diagram", 0],
    ])
  })

  it("shows the segments of a review not shown in segments as one, with a tab per Trace Diagram and no heading", () => {
    const page = tracePageOf({ isSegmented: false, segments: [priceSegment, cartSegment] })

    expect(page.segments.map(({ id, heading, traceDiagram }) => [id, heading, traceDiagram.anchorId, traceDiagram.tabs.map((tab) => tab.id)])).toStrictEqual([
      ["price", null, "trace-diagram", ["price", "cart"]],
    ])
  })

  it("leads a code link to the waypoint of its declaration, with no link to a forge", () => {
    const page = tracePageOf({ isSegmented: true, segments: [priceSegment, cartSegment] })

    expect(page.codeLinks[`${PRICE_PATH}#priceOf`]).toMatchObject({ pathLabel: PRICE_PATH, anchorId: "waypoint-price-of", forgeLink: null })
    expect(page.codeLinks[`${CART_PATH}#subtotal`]).toMatchObject({ anchorId: "waypoint-subtotal", forgeLink: null })
  })
})
