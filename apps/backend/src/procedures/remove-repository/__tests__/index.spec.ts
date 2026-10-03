import { AT_REPOSITORIES, createSetupContext, STOREFRONT } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { removeRepository } from "@/procedures/remove-repository"

describe("removeRepository", () => {
  it("removes a listed repository from the list", async () => {
    const context = createSetupContext(AT_REPOSITORIES, [STOREFRONT])

    await expect(removeRepository({ name: "storefront" }, context)).resolves.toStrictEqual({ name: "storefront" })
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([])
  })

  it("has nothing to remove for a repository that is not listed", async () => {
    const context = createSetupContext(AT_REPOSITORIES, [STOREFRONT])

    await expect(removeRepository({ name: "ledger-api" }, context)).resolves.toBeNull()
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([STOREFRONT])
  })
})
