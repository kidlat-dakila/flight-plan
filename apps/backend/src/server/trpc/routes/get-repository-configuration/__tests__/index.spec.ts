import { AT_REPOSITORIES, createSetupContext, STOREFRONT } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("repository.configuration route", () => {
  it("delegates to the get-repository-configuration procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES, [STOREFRONT]))

    await expect(caller.repository.configuration({ name: "storefront" })).resolves.toMatchObject({ name: "storefront" })
  })

  it("maps a repository that is not listed to a NOT_FOUND error", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES, [STOREFRONT]))

    await expect(caller.repository.configuration({ name: "ledger-api" })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "ledger-api is no longer on the list.",
    })
  })
})
