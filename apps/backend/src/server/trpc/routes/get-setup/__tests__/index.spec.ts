import { AT_FORGES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("setup.get route", () => {
  it("delegates to the get-setup procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_FORGES))

    await expect(caller.setup.get({ step: null })).resolves.toMatchObject({
      progressLabel: "Step 2 of 4",
      form: { step: "forges" },
    })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_FORGES))
    const inputWithUnknownProperty = { step: null, isComplete: true }

    await expect(caller.setup.get(inputWithUnknownProperty)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
