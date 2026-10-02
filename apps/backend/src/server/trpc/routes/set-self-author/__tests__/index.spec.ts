import { createSetupContext, DEV, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("setup.setSelfAuthor route", () => {
  it("delegates to the set-self-author procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.setSelfAuthor({ repositoryName: "checkout-web", authorId: DEV.id })).resolves.toStrictEqual({
      authorId: DEV.id,
    })
  })

  it("maps an unknown author to a NOT_FOUND error", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.setSelfAuthor({ repositoryName: "checkout-web", authorId: "nobody" })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "This repository or user is no longer available.",
    })
  })
})
