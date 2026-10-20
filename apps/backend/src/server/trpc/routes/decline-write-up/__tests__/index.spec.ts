import { createMockProcedureContext } from "@/procedures/context"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { DRAFT_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { appRouter } from "@/server/trpc/router"

const NOW = new Date("2026-10-12T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-412" }

const createCaller = async () => {
  const reviewStore = new InMemoryReviewStore([])
  await reviewStore.writeScaffold(KEY, {
    artifact: DRAFT_ARTIFACT,
    baseCommit: "0000000",
    request: { configurationId: "standard", preset: "standard", order: "foundations-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
  })
  return appRouter.createCaller({ ...createMockProcedureContext(NOW), reviewStore })
}

describe("review.declineWriteUp route", () => {
  it("delegates to the decline-write-up procedure", async () => {
    await expect((await createCaller()).review.declineWriteUp(KEY)).resolves.toStrictEqual({ kind: "declined" })
  })

  it("maps a review target without a review artifact to a NOT_FOUND error", async () => {
    await expect((await createCaller()).review.declineWriteUp({ ...KEY, targetId: "pr-416" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
