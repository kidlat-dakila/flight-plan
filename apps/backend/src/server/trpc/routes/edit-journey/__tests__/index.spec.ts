import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.editJourney route", () => {
  it("delegates to the edit-journey procedure and returns a rejection as data", async () => {
    await expect(
      createCaller().review.editJourney({ repositoryName: "storefront", targetId: "pr-412", segmentId: "stock-check", edit: { kind: "remove-card", nodeId: "gone" } }),
    ).resolves.toStrictEqual({ kind: "rejected", message: "This card is no longer on the diagram." })
  })

  it("maps a review target without a Flight Plan to a NOT_FOUND error", async () => {
    await expect(
      createCaller().review.editJourney({ repositoryName: "storefront", targetId: "pr-416", segmentId: "stock-check", edit: { kind: "remove-diagram" } }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
