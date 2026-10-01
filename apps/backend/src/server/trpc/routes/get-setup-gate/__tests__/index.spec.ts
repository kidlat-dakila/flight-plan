import { createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { appRouter } from "@/server/trpc/router"

describe("setup.gate route", () => {
  it("delegates to the get-setup-gate procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(EMPTY_SETUP))

    await expect(caller.setup.gate({ path: "/" })).resolves.toStrictEqual({ redirectTo: "/setup" })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(createSetupContext(EMPTY_SETUP))
    const inputWithUnknownProperty = { path: "/", isComplete: true }

    await expect(caller.setup.gate(inputWithUnknownProperty)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
