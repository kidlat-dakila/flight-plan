import { createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { appRouter } from "@/server/trpc/router"

describe("setup.browseFolders route", () => {
  it("delegates to the browse-folders procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(EMPTY_SETUP))

    await expect(caller.setup.browseFolders({ path: "/Users/dev/work", purpose: "repository" })).resolves.toStrictEqual({
      path: "/Users/dev/work",
      parentPath: "/Users/dev",
      folders: [{ name: "mobile-app", path: "/Users/dev/work/mobile-app", kind: "repository", kindLabel: "Repository" }],
      message: null,
    })
  })

  it("maps a missing folder to a NOT_FOUND error", async () => {
    const caller = appRouter.createCaller(createSetupContext(EMPTY_SETUP))

    await expect(caller.setup.browseFolders({ path: "/nowhere", purpose: "repository" })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "This folder does not exist or cannot be read.",
    })
  })
})
