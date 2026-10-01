import { createMockProcedureContext } from "@/procedures/context"
import { getReview } from "@/procedures/get-review"
import type { GetReviewInput } from "@/procedures/get-review/utils/schemas"
import { setReviewed } from "@/procedures/set-reviewed"

const NO_DIAGRAM_REQUEST = { levels: null, isShowingData: null, isShowingAssumed: null }

const REVIEW_REQUEST: GetReviewInput = {
  repositoryName: "storefront",
  targetId: "pr-405",
  filterKeys: null,
  isShowingReviewed: false,
  journey: NO_DIAGRAM_REQUEST,
  blast: NO_DIAGRAM_REQUEST,
}

const KEY = { repositoryName: "storefront", targetId: "pr-405" }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("setReviewed", () => {
  it("stores the mark, so the next read hides the waypoint", async () => {
    const context = createContext()

    await expect(
      setReviewed({ ...KEY, subject: { kind: "waypoint", id: "line-total" }, isReviewed: true }, context),
    ).resolves.toStrictEqual({ isReviewed: true })
    await expect(getReview(REVIEW_REQUEST, context)).resolves.toMatchObject({
      walkthroughControls: { reviewedToggle: { label: "Show reviewed (1)" }, stepping: { idleLabel: "1 waypoint" } },
    })
  })

  it("takes a mark off again", async () => {
    const context = createContext()
    await setReviewed({ ...KEY, subject: { kind: "file", path: "src/cart/subtotal.ts" }, isReviewed: true }, context)

    await expect(getReview(REVIEW_REQUEST, context)).resolves.toMatchObject({ segments: [{ walkthrough: { files: [] } }] })

    await setReviewed({ ...KEY, subject: { kind: "file", path: "src/cart/subtotal.ts" }, isReviewed: false }, context)

    await expect(getReview(REVIEW_REQUEST, context)).resolves.toMatchObject({
      walkthroughControls: { reviewedToggle: { label: "Show reviewed (0)", isAvailable: false } },
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
