import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.searchFiles route", () => {
  it("delegates to the search-files procedure", async () => {
    await expect(
      createCaller().review.searchFiles({ repositoryName: "storefront", targetId: "pr-405", query: "subtotal.ts", scope: "flight-plan" }),
    ).resolves.toMatchObject({ options: [{ path: "src/cart/subtotal.ts", stateLabel: "Changed" }] })
  })

  it("maps a review target without a Flight Plan to a NOT_FOUND error", async () => {
    await expect(
      createCaller().review.searchFiles({ repositoryName: "storefront", targetId: "pr-416", query: "", scope: "repository" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
