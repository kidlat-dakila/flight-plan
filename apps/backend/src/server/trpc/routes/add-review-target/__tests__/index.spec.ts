import { createMockProcedureContext } from "@/procedures/context"
import { createAddableRepositoryOpener } from "@/procedures/search-addable-targets/__tests__/addable-repository"
import { appRouter } from "@/server/trpc/router"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const createCaller = () =>
  appRouter.createCaller({ ...createMockProcedureContext(NOW), openRepository: createAddableRepositoryOpener(), now: () => NOW })

describe("repository.addTarget route", () => {
  it("delegates to the add-review-target procedure", async () => {
    await expect(createCaller().repository.addTarget({ repositoryName: "storefront", targetId: "branch-spike/returns" })).resolves.toStrictEqual({
      targetId: "branch-spike/returns",
    })
  })

  it("maps a target that cannot be added to a BAD_REQUEST error with the reason", async () => {
    await expect(createCaller().repository.addTarget({ repositoryName: "storefront", targetId: "branch-gone" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This branch is no longer in the repository.",
    })
  })

  it("maps an unknown repository to a NOT_FOUND error", async () => {
    await expect(createCaller().repository.addTarget({ repositoryName: "gone", targetId: "branch-spike/returns" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
