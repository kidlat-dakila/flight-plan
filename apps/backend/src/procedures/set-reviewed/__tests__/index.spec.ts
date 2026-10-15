import { createMockProcedureContext } from "@/procedures/context"
import { getReview } from "@/procedures/get-review"
import type { GetReviewInput } from "@/procedures/get-review/utils/schemas"
import { setReviewed } from "@/procedures/set-reviewed"

const REVIEW_REQUEST: GetReviewInput = {
  repositoryName: "storefront",
  targetId: "pr-405",
  filterKeys: null,
  isShowingReviewed: false,
}

const KEY = { repositoryName: "storefront", targetId: "pr-405" }

type ReviewPage = Awaited<ReturnType<typeof getReview>>

const waypointCountOf = (page: ReviewPage): number =>
  page?.kind === "artifact"
    ? page.segments.flatMap((segment) => segment.walkthrough.files.flatMap((file) => file.rows.filter((row) => row.kind === "waypoint"))).length
    : 0

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("setReviewed", () => {
  it("stores the mark, so the next read hides the waypoint", async () => {
    const context = createContext()

    await expect(
      setReviewed({ ...KEY, subject: { kind: "waypoint", id: "line-total" }, isReviewed: true }, context),
    ).resolves.toStrictEqual({ isReviewed: true })
    const page = await getReview(REVIEW_REQUEST, context)

    expect(page).toMatchObject({ walkthroughControls: { reviewedToggle: { label: "Reviewed", countLabel: "1 waypoint" } } })
    expect(waypointCountOf(page)).toBe(1)
  })

  it("takes a mark off again", async () => {
    const context = createContext()
    await setReviewed({ ...KEY, subject: { kind: "file", path: "src/cart/subtotal.ts" }, isReviewed: true }, context)

    await expect(getReview(REVIEW_REQUEST, context)).resolves.toMatchObject({ segments: [{ walkthrough: { files: [] } }] })

    await setReviewed({ ...KEY, subject: { kind: "file", path: "src/cart/subtotal.ts" }, isReviewed: false }, context)

    await expect(getReview(REVIEW_REQUEST, context)).resolves.toMatchObject({
      walkthroughControls: { reviewedToggle: { countLabel: "0 waypoints", isAvailable: false } },
    })
  })

  it("reports nothing when the review has no artifact or no such waypoint", async () => {
    const context = createContext()

    await expect(
      setReviewed({ ...KEY, targetId: "pr-416", subject: { kind: "waypoint", id: "line-total" }, isReviewed: true }, context),
    ).resolves.toBeNull()
    await expect(
      setReviewed({ ...KEY, subject: { kind: "waypoint", id: "gone" }, isReviewed: true }, context),
    ).resolves.toBeNull()
  })
})
