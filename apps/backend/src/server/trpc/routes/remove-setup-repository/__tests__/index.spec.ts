import { createSetupContext, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("setup.removeRepository route", () => {
  it("delegates to the remove-setup-repository procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.removeRepository({ name: "checkout-web" })).resolves.toStrictEqual({ name: "checkout-web" })
  })

  it("maps an unknown repository to a NOT_FOUND error", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.removeRepository({ name: "storefront" })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "This repository is no longer in the setup.",
    })
  })
})
