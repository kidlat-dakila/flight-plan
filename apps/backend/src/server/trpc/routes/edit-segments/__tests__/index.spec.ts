import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.editSegments route", () => {
  it("delegates to the edit-segments procedure and returns a rejection as data", async () => {
    await expect(
      createCaller().review.editSegments({ repositoryName: "storefront", targetId: "pr-412", edit: { kind: "remove", segmentId: "gone" } }),
    ).resolves.toStrictEqual({ kind: "rejected", message: "This segment is no longer in the Flight Plan." })
  })

  it("maps a review target without a Flight Plan to a NOT_FOUND error", async () => {
    await expect(
      createCaller().review.editSegments({ repositoryName: "storefront", targetId: "pr-416", edit: { kind: "remove", segmentId: "all" } }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
