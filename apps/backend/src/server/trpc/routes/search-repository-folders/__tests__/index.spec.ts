import { createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { appRouter } from "@/server/trpc/router"

describe("setup.searchFolders route", () => {
  it("delegates to the search-repository-folders procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(EMPTY_SETUP))

    await expect(caller.setup.searchFolders({ query: "mobile" })).resolves.toStrictEqual({
      options: [{ path: "/Users/dev/work/mobile-app", name: "mobile-app", isAdded: false, stateLabel: null }],
      message: null,
    })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(createSetupContext(EMPTY_SETUP))
    const inputWithUnknownProperty = { query: "mobile", limit: 100 }

    await expect(caller.setup.searchFolders(inputWithUnknownProperty)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
