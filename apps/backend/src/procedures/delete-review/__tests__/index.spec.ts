import { createMockProcedureContext } from "@/procedures/context"
import { deleteReview } from "@/procedures/delete-review"
import { getReview } from "@/procedures/get-review"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { DRAFT_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"

const NOW = new Date("2026-10-12T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-416" }

describe("deleteReview", () => {
  it("deletes the review artifact, so the page offers to start a review again", async () => {
    const reviewStore = new InMemoryReviewStore([])
    await reviewStore.writeScaffold(KEY, {
      artifact: DRAFT_ARTIFACT,
      baseCommit: "0000000",
      request: { configurationId: "standard", preset: "standard", order: "foundations-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
    })
    const context = { ...createMockProcedureContext(NOW), reviewStore }

    await expect(deleteReview(KEY, context)).resolves.toStrictEqual({ message: "Flight Plan deleted" })

    await expect(getReview({ ...KEY, filterKeys: [], isShowingReviewed: false }, context)).resolves.toMatchObject({ kind: "missing" })
    await expect(deleteReview(KEY, context)).resolves.toBeNull()
  })
})
