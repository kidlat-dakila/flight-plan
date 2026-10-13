import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-13T12:00:00.000Z")))

describe("review.markComplete route", () => {
  it("marks the review artifact as complete and says so", async () => {
    await expect(createCaller().review.markComplete({ repositoryName: "storefront", targetId: "pr-409", pullRequestTargetId: null })).resolves.toStrictEqual({
      message: "Flight Plan marked as complete",
      targetId: "pr-409",
    })
  })

  it("maps a review target without a review artifact to a NOT_FOUND error", async () => {
    await expect(createCaller().review.markComplete({ repositoryName: "storefront", targetId: "pr-416", pullRequestTargetId: null })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
