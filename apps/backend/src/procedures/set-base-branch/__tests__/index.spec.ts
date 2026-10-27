import { AT_FORGES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { setBaseBranch } from "@/procedures/set-base-branch"

describe("setBaseBranch", () => {
  it("saves the branch the repository is compared with", async () => {
    const context = createSetupContext(AT_FORGES)

    await expect(setBaseBranch({ repositoryName: "checkout-web", baseBranch: "develop" }, context)).resolves.toMatchObject({
      repositories: [{ name: "checkout-web", baseBranch: "develop" }],
    })
    await expect(context.setupStore.read()).resolves.toMatchObject({ repositories: [{ baseBranch: "develop" }] })
  })

  it("has no result for an unknown repository or a branch the repository does not have", async () => {
    const context = createSetupContext(AT_FORGES)

    await expect(setBaseBranch({ repositoryName: "storefront", baseBranch: "develop" }, context)).resolves.toBeNull()
    await expect(setBaseBranch({ repositoryName: "checkout-web", baseBranch: "trunk" }, context)).resolves.toBeNull()
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_FORGES)
  })
})
