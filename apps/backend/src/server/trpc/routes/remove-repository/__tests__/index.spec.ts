import { AT_REPOSITORIES, createSetupContext, STOREFRONT } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("repository.remove route", () => {
  it("delegates to the remove-repository procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES, [STOREFRONT]))

    await expect(caller.repository.remove({ name: "storefront" })).resolves.toStrictEqual({ name: "storefront" })
  })

  it("maps a repository that is not listed to a NOT_FOUND error", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES, [STOREFRONT]))

    await expect(caller.repository.remove({ name: "ledger-api" })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "ledger-api is no longer on the list.",
    })
  })
})
