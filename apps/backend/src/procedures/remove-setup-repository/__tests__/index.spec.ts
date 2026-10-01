import { createSetupContext, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { removeSetupRepository } from "@/procedures/remove-setup-repository"

describe("removeSetupRepository", () => {
  it("removes the repository and its tracked authors from the stored setup", async () => {
    const context = createSetupContext(READY_TO_FINISH)

    await expect(removeSetupRepository({ name: "checkout-web" }, context)).resolves.toMatchObject({ repositories: [] })
    await expect(context.setupStore.read()).resolves.toMatchObject({ repositories: [] })
  })

  it("leaves the stored setup unchanged for an unknown repository", async () => {
    const context = createSetupContext(READY_TO_FINISH)

    await expect(removeSetupRepository({ name: "storefront" }, context)).resolves.toBeNull()
    await expect(context.setupStore.read()).resolves.toStrictEqual(READY_TO_FINISH)
  })
})
