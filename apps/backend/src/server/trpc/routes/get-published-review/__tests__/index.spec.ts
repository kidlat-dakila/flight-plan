import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const REQUEST = { repositoryName: "storefront", targetId: "pr-405" }

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.published route", () => {
  it("delegates to the get-published-review procedure", async () => {
    await expect(createCaller().review.published(REQUEST)).resolves.toMatchObject({ header: { label: "Published Flight Plan" } })
  })

  it("maps a review target without a Flight Plan to a NOT_FOUND error", async () => {
    await expect(createCaller().review.published({ ...REQUEST, targetId: "pr-416" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
