import { createSetupContext, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

const CHECKOUT_WEB_SEARCH = { path: "/Users/dev/projects/checkout-web", query: "develop" }

describe("searchBaseBranches routes", () => {
  it("delegates setup.searchBaseBranches to the search-base-branches procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.searchBaseBranches(CHECKOUT_WEB_SEARCH)).resolves.toMatchObject({
      options: [{ id: "develop", label: "develop" }],
      detectedBranch: "main",
    })
  })

  it("delegates repository.searchBaseBranches to the search-base-branches procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.repository.searchBaseBranches(CHECKOUT_WEB_SEARCH)).resolves.toMatchObject({
      options: [{ id: "develop" }],
      detectedBranch: "main",
    })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    const inputWithUnknownProperty = { ...CHECKOUT_WEB_SEARCH, repositoryName: "checkout-web" }

    await expect(caller.repository.searchBaseBranches(inputWithUnknownProperty)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
