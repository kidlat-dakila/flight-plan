import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("repository.searchAuthors route", () => {
  it("delegates to the search-addition-authors procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))

    await expect(
      caller.repository.searchAuthors({
        path: "/Users/dev/projects/ledger-api",
        role: "tracked",
        query: "lena",
        repositoryName: null,
        selfAuthorId: null,
        trackedAuthorIds: [],
      }),
    ).resolves.toMatchObject({ options: [{ id: "lena@acme.example" }] })
  })
})
