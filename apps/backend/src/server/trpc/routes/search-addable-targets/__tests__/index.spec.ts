import { createMockProcedureContext } from "@/procedures/context"
import { createAddableRepositoryOpener } from "@/procedures/search-addable-targets/__tests__/addable-repository"
import { appRouter } from "@/server/trpc/router"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const createCaller = () =>
  appRouter.createCaller({ ...createMockProcedureContext(NOW), openRepository: createAddableRepositoryOpener(), now: () => NOW })

describe("repository.searchTargets route", () => {
  it("delegates to the search-addable-targets procedure", async () => {
    await expect(createCaller().repository.searchTargets({ repositoryName: "storefront", query: "returns" })).resolves.toMatchObject({
      options: [{ id: "branch-spike/returns" }],
    })
  })

  it("maps an unknown repository to a NOT_FOUND error", async () => {
    await expect(createCaller().repository.searchTargets({ repositoryName: "gone", query: "" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
