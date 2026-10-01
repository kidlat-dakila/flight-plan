import { createSetupContext, LENA, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("setup.setAuthorTracking route", () => {
  it("delegates to the set-author-tracking procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(
      caller.setup.setAuthorTracking({ repositoryName: "checkout-web", authorId: LENA.id, isTracked: false }),
    ).resolves.toStrictEqual({ authorId: LENA.id })
  })

  it("maps an unknown author to a NOT_FOUND error", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(
      caller.setup.setAuthorTracking({ repositoryName: "checkout-web", authorId: "nobody", isTracked: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "This repository or author is no longer available." })
  })
})
