import { completeSetup } from "@/procedures/complete-setup"
import {
  AT_REPOSITORIES,
  createSetupContext,
  READY_TO_FINISH,
  STOREFRONT,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"

describe("completeSetup", () => {
  it("marks the setup complete and lists its repositories", async () => {
    const context = createSetupContext(READY_TO_FINISH, [STOREFRONT])

    await expect(completeSetup({}, context)).resolves.toMatchObject({ kind: "accepted" })
    await expect(context.setupStore.read()).resolves.toMatchObject({ isComplete: true })
    await expect(context.repositoryStore.list()).resolves.toMatchObject([
      { name: "storefront" },
      { name: "checkout-web", forge: "git" },
    ])
  })

  it("changes nothing while a step is unfinished", async () => {
    const context = createSetupContext(AT_REPOSITORIES, [STOREFRONT])

    await expect(completeSetup({}, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Add at least one repository.",
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_REPOSITORIES)
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([STOREFRONT])
  })
})
