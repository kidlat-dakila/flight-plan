import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.editContext route", () => {
  it("delegates to the edit-context procedure and returns a rejection as data", async () => {
    await expect(
      createCaller().review.editContext({ repositoryName: "storefront", targetId: "pr-412", segmentId: "gone", context: "Text." }),
    ).resolves.toStrictEqual({ kind: "rejected", message: "This segment is no longer in the Flight Plan." })
  })

  it("maps a review target without a Flight Plan to a NOT_FOUND error", async () => {
    await expect(
      createCaller().review.editContext({ repositoryName: "storefront", targetId: "pr-416", segmentId: "all", context: "Text." }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
