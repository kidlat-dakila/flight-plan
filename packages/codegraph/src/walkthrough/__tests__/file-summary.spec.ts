import { CART_PATH, cartSource, createFinding, createSegment, createViewContext, createWaypoint, PRICE_PATH } from "@/__tests__/review-fixture"
import { prepareWalkthrough, type WalkthroughRequest } from "@/walkthrough/build"
import { summarizeWalkthroughFiles } from "@/walkthrough/file-summary"
import { flattenWaypoints } from "@/walkthrough/waypoints"
import { NO_REVIEWED_MARKS, type ReviewedMarks } from "@flightplan/reviewed-marks"

const EVERYTHING: WalkthroughRequest = { filterKeys: [], isShowingReviewed: false }

const segment = createSegment({
  walkthrough: {
    files: [
      {
        path: PRICE_PATH,
        waypoints: [
          createWaypoint("price-of", "priceOf", { findings: [createFinding("nit-1", "nit"), createFinding("bug-1", "bug")] }),
          createWaypoint("format", "format", { coreChange: "Formats every price." }),
        ],
      },
      { path: CART_PATH, waypoints: [createWaypoint("subtotal", "subtotal")] },
    ],
  },
})

const summarize = (request: WalkthroughRequest, marks: ReviewedMarks = NO_REVIEWED_MARKS) =>
  summarizeWalkthroughFiles(prepareWalkthrough(segment, marks, request, createViewContext()))

const summaryOf = (path: string, request: WalkthroughRequest, marks: ReviewedMarks = NO_REVIEWED_MARKS) =>
  summarize(request, marks).find((summary) => summary.path === path)

const reviewedSubtotal = (): ReviewedMarks => {
  const [flat] = flattenWaypoints(segment.walkthrough.files[1], cartSource)
  return { ...NO_REVIEWED_MARKS, waypoints: { subtotal: flat.fingerprint } }
}

describe("summarizeWalkthroughFiles", () => {
  it("lists every file of the walkthrough, with its marks in the order of their urgency", () => {
    expect(summarize(EVERYTHING).map((summary) => summary.path).sort()).toStrictEqual([CART_PATH, PRICE_PATH].sort())
    expect(summaryOf(PRICE_PATH, EVERYTHING)?.markKinds).toStrictEqual(["bug", "core-change", "nit"])
    expect(summaryOf(CART_PATH, EVERYTHING)?.markKinds).toStrictEqual([])
  })

  it("counts the waypoints of a file and those the filter keeps", () => {
    expect(summaryOf(PRICE_PATH, EVERYTHING)).toMatchObject({ waypointCount: 2, matchCount: 2, isShown: true })
    expect(summaryOf(PRICE_PATH, { filterKeys: ["bug"], isShowingReviewed: false })).toMatchObject({ waypointCount: 2, matchCount: 1, isShown: true })
  })

  it("leaves out a file the filter keeps no waypoint of", () => {
    expect(summaryOf(CART_PATH, { filterKeys: ["bug"], isShowingReviewed: false })).toMatchObject({ matchCount: 0, isShown: false })
  })

  it("counts the reviewed waypoints, and hides a file whose waypoints are all reviewed until reviewed ones are shown", () => {
    expect(summaryOf(CART_PATH, EVERYTHING, reviewedSubtotal())).toMatchObject({ reviewedCount: 1, isShown: false })
    expect(summaryOf(CART_PATH, { filterKeys: [], isShowingReviewed: true }, reviewedSubtotal())).toMatchObject({ reviewedCount: 1, isShown: true })
  })
})
