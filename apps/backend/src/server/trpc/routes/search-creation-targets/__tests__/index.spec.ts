import { createMockProcedureContext } from "@/procedures/context"
import { appRouter } from "@/server/trpc/router"

const createCaller = () => appRouter.createCaller(createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z")))

describe("review.searchTargets route", () => {
  it("delegates to the search-creation-targets procedure", async () => {
    await expect(createCaller().review.searchTargets({ repositoryName: "storefront", query: "gift" })).resolves.toMatchObject({
      options: [{ id: "pr-416" }],
    })
  })

  it("maps an unknown repository to a NOT_FOUND error", async () => {
    await expect(createCaller().review.searchTargets({ repositoryName: "gone", query: "" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
