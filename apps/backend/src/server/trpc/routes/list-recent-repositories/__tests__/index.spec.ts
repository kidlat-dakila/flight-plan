import { createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { NO_RECENT_REPOSITORY_MESSAGE } from "@/procedures/list-recent-repositories/utils/build-recent-repositories"
import { appRouter } from "@/server/trpc/router"

describe("setup.recentRepositories route", () => {
  it("delegates to the list-recent-repositories procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(EMPTY_SETUP))

    await expect(caller.setup.recentRepositories({})).resolves.toStrictEqual({
      repositories: [],
      message: NO_RECENT_REPOSITORY_MESSAGE,
    })
  })
})
