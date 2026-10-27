import { createSetupContext, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("setup.setBaseBranch route", () => {
  it("delegates to the set-base-branch procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.setBaseBranch({ repositoryName: "checkout-web", baseBranch: "develop" })).resolves.toStrictEqual({
      baseBranch: "develop",
    })
  })

  it("maps an unknown branch to a NOT_FOUND error", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.setBaseBranch({ repositoryName: "checkout-web", baseBranch: "trunk" })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "This repository or branch is no longer available.",
    })
  })

  it("rejects an empty branch name", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.setBaseBranch({ repositoryName: "checkout-web", baseBranch: " " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
  })
})
