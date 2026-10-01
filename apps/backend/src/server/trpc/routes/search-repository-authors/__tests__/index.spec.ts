import { createSetupContext, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("setup.searchAuthors route", () => {
  it("delegates to the search-repository-authors procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.searchAuthors({ repositoryName: "checkout-web", role: "tracked", query: "mira" })).resolves.toMatchObject({
      options: [{ name: "Mira Sandoval", isTaken: false }],
    })
  })

  it("maps an unknown repository to a NOT_FOUND error", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.searchAuthors({ repositoryName: "storefront", role: "tracked", query: "" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
