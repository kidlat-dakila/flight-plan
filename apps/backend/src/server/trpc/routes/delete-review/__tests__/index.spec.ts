import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-12T12:00:00.000Z")))

describe("review.delete route", () => {
  it("deletes the review artifact and says so", async () => {
    await expect(createCaller().review.delete({ repositoryName: "storefront", targetId: "pr-412" })).resolves.toStrictEqual({
      message: "Flight Plan deleted",
    })
  })

  it("maps a review target without a review artifact to a NOT_FOUND error", async () => {
    await expect(createCaller().review.delete({ repositoryName: "storefront", targetId: "pr-416" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
