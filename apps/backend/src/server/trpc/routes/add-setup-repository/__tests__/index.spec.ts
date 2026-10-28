import { AT_REPOSITORIES, CHECKOUT_WEB, createSetupContext, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

const NOBODY_TRACKED = { trackedAuthorIds: [], baseBranch: null }

describe("setup.addRepository route", () => {
  it("delegates to the add-setup-repository procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))

    await expect(caller.setup.addRepository({ path: CHECKOUT_WEB.path, ...NOBODY_TRACKED })).resolves.toStrictEqual({ name: "checkout-web" })
  })

  it("maps a rejected folder to a BAD_REQUEST error", async () => {
    const caller = appRouter.createCaller(createSetupContext(READY_TO_FINISH))

    await expect(caller.setup.addRepository({ path: CHECKOUT_WEB.path, ...NOBODY_TRACKED })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "/Users/dev/projects/checkout-web is already on the list.",
    })
  })
})
