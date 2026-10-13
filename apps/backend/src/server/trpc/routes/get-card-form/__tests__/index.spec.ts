import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.cardForm route", () => {
  it("delegates to the get-card-form procedure", async () => {
    await expect(
      createCaller().review.cardForm({ repositoryName: "storefront", targetId: "pr-412", segmentId: "stock-check", nodeId: "post-checkout" }),
    ).resolves.toMatchObject({ nodeId: "post-checkout", title: "Modify postCheckout" })
  })

  it("maps a card that is not on the diagram to a NOT_FOUND error", async () => {
    await expect(
      createCaller().review.cardForm({ repositoryName: "storefront", targetId: "pr-412", segmentId: "stock-check", nodeId: "gone" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
