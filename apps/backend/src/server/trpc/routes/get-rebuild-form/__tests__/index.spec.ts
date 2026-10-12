import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-12T12:00:00.000Z")))

describe("review.rebuildForm route", () => {
  it("returns the form the rebuild dialog shows", async () => {
    await expect(createCaller().review.rebuildForm({ repositoryName: "storefront", targetId: "pr-412", mode: "regenerate" })).resolves.toMatchObject({
      title: "Regenerate from scratch",
    })
  })

  it("maps a review target without a review artifact to a NOT_FOUND error", async () => {
    await expect(createCaller().review.rebuildForm({ repositoryName: "storefront", targetId: "pr-416", mode: "update" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
