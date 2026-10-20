import {
  CART_PATH,
  createCodeBlock,
  createSegment,
  createViewContext,
  createWaypoint,
  PRICE_PATH,
} from "@/__tests__/review-fixture"
import { prepareWalkthrough, type WalkthroughRequest } from "@/walkthrough/build"
import { buildChangeOverview } from "@/walkthrough/change-overview"
import type { ChangeOverview, CodeBlock, Segment } from "@flightplan/configurations"
import { NO_REVIEWED_MARKS } from "@flightplan/reviewed-marks"

const EVERYTHING: WalkthroughRequest = { filterKeys: [], isShowingReviewed: true }

const spanning = (lineStart: number, lineEnd: number): CodeBlock["lineOfCodeRangeReference"] => [
  { start: { line: lineStart, column: 1 }, end: { line: lineEnd, column: 1 } },
]

const overviewOf = (segment: Segment): ChangeOverview => {
  const context = createViewContext()
  return buildChangeOverview(prepareWalkthrough(segment, NO_REVIEWED_MARKS, EVERYTHING, context), context.blobLinkOf)
}

const withoutPreviews = (overview: ChangeOverview): ChangeOverview => ({
  ...overview,
  rows: overview.rows.map((row) => ({ ...row, cards: row.cards.map((card) => ({ ...card, preview: null })) })),
})

const PRICE_OF = createCodeBlock("price-of", PRICE_PATH, { name: "priceOf", lineOfCodeRangeReference: spanning(11, 13), classifications: ["database-read-write", "validation"] })
const FORMAT = createCodeBlock("format", PRICE_PATH, { name: "format", lineOfCodeRangeReference: spanning(14, 14), classifications: ["logic"] })
const SUBTOTAL = createCodeBlock("subtotal", CART_PATH, { name: "subtotal", type: "component", lineOfCodeRangeReference: spanning(1, 2), classifications: ["component"] })

describe("buildChangeOverview", () => {
  it("puts the root blocks of the walkthrough in one row per classification, in the order of the hierarchy", () => {
    const segment = createSegment({
      walkthrough: {
        files: [
          { path: PRICE_PATH, waypoints: [createWaypoint("w-price-of", "priceOf", { codeBlocks: [PRICE_OF] }), createWaypoint("w-format", "format", { codeBlocks: [FORMAT] })] },
          { path: CART_PATH, waypoints: [createWaypoint("w-subtotal", "subtotal", { codeBlocks: [SUBTOTAL] })] },
        ],
      },
    })

    expect(withoutPreviews(overviewOf(segment))).toStrictEqual({
      heading: "Change Overview",
      emptyMessage: null,
      rows: [
        {
          classification: { key: "component", label: "Component" },
          cards: [{ id: `${CART_PATH}#component:subtotal`, label: "subtotal", typeLabel: "Component", path: CART_PATH, change: "modified", changeLabel: "Modified", waypointAnchorId: "waypoint-w-subtotal", preview: null }],
        },
        {
          classification: { key: "database-read-write", label: "Database read/write" },
          cards: [{ id: `${PRICE_PATH}#function:priceOf`, label: "priceOf", typeLabel: "Function", path: PRICE_PATH, change: "modified", changeLabel: "Modified", waypointAnchorId: "waypoint-w-price-of", preview: null }],
        },
        {
          classification: { key: "logic", label: "Logic" },
          cards: [{ id: `${PRICE_PATH}#function:format`, label: "format", typeLabel: "Function", path: PRICE_PATH, change: "modified", changeLabel: "Modified", waypointAnchorId: "waypoint-w-format", preview: null }],
        },
      ],
    })
  })

  it("previews the code of each block as a code link does, opening its waypoint", () => {
    const segment = createSegment({
      walkthrough: { files: [{ path: PRICE_PATH, waypoints: [createWaypoint("w-price-of", "priceOf", { codeBlocks: [PRICE_OF] })] }] },
    })

    const [{ cards: [{ preview }] }] = overviewOf(segment).rows

    expect(preview).toMatchObject({ pathLabel: PRICE_PATH, rangeLabel: "Lines 11 to 13, 3 lines", anchorId: "waypoint-w-price-of" })
    expect(preview?.lines.length).toBeGreaterThan(0)
  })

  it("marks a deleted root block deleted, and leaves imports out", () => {
    const removed = createCodeBlock("removed", PRICE_PATH, { name: "legacyRate", type: "deleted", deletedType: "function", lineOfCodeRangeReference: spanning(11, 11), classifications: ["logic"] })
    const imported = createCodeBlock("import", PRICE_PATH, { name: "rates", type: "import", lineOfCodeRangeReference: spanning(1, 1), classifications: ["logic"] })
    const segment = createSegment({
      walkthrough: {
        files: [{ path: PRICE_PATH, waypoints: [createWaypoint("w-removed", "priceOf", { codeBlocks: [removed] }), createWaypoint("w-import", "format", { codeBlocks: [imported] })] }],
      },
    })

    expect(overviewOf(segment).rows.flatMap((row) => row.cards.map((card) => [card.label, card.typeLabel, card.change]))).toStrictEqual([
      ["legacyRate", "Function", "deleted"],
    ])
  })

  it("says so when nothing changed", () => {
    expect(overviewOf(createSegment({ walkthrough: { files: [] } }))).toStrictEqual({ heading: "Change Overview", emptyMessage: "No code changed.", rows: [] })
  })
})
