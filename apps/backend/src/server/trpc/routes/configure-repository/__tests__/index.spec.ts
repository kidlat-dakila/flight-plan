import { AT_REPOSITORIES, createSetupContext, DEV, STOREFRONT } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("repository.configure route", () => {
  it("delegates to the configure-repository procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES, [STOREFRONT]))

    await expect(
      caller.repository.configure({ repositoryName: "storefront", selfAuthorId: DEV.id, trackedAuthorIds: [] }),
    ).resolves.toStrictEqual({ name: "storefront" })
  })

  it("maps a rejection to a BAD_REQUEST error", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES, [STOREFRONT]))

    await expect(
      caller.repository.configure({ repositoryName: "storefront", selfAuthorId: null, trackedAuthorIds: [] }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Pick which user you are in storefront." })
  })
})
