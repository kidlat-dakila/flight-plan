import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-12T12:00:00.000Z")))

describe("review.writeUpPlan route", () => {
  it("delegates to the get-write-up-plan procedure", async () => {
    await expect(createCaller().review.writeUpPlan({ repositoryName: "storefront", targetId: "pr-412", sections: null })).resolves.toHaveProperty("kind")
  })

  it("maps a review target without a review artifact to a NOT_FOUND error", async () => {
    await expect(createCaller().review.writeUpPlan({ repositoryName: "storefront", targetId: "pr-416", sections: null })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
