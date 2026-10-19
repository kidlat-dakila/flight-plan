import { createMockProcedureContext } from "@/procedures/context"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { DRAFT_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import type { WriteUpReviewInput } from "@/procedures/write-up-review/utils/schemas"
import { appRouter } from "@/server/trpc/router"

const REQUEST: WriteUpReviewInput = {
  repositoryName: "storefront",
  targetId: "pr-412",
  sections: [],
  configurationId: "standard",
  walkthroughOrder: "imports-bottom-up",
  isSegmented: true,
}

const NOW = new Date("2026-10-12T12:00:00.000Z")

const createCaller = async () => {
  const reviewStore = new InMemoryReviewStore([])
  await reviewStore.writeScaffold({ repositoryName: "storefront", targetId: "pr-412" }, {
    artifact: DRAFT_ARTIFACT,
    baseCommit: "0000000",
    request: { configurationId: "standard", preset: "standard", order: "foundations-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
  })
  return appRouter.createCaller({ ...createMockProcedureContext(NOW), reviewStore })
}

describe("review.writeUp route", () => {
  it("delegates to the write-up-review procedure and returns a rejection as data", async () => {
    await expect((await createCaller()).review.writeUp(REQUEST)).resolves.toMatchObject({ kind: "rejected", field: "sections" })
  })

  it("maps a review target without a review artifact to a NOT_FOUND error", async () => {
    await expect((await createCaller()).review.writeUp({ ...REQUEST, targetId: "pr-416" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
