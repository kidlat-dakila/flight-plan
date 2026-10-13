import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("settings.get route", () => {
  it("delegates to the get-settings procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))

    await expect(caller.settings.get({ section: "configuration" })).resolves.toMatchObject({
      section: "configuration",
      selectedPreset: "minimal",
    })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))
    const inputWithUnknownProperty = { section: "agents" as const, step: "agents" }

    await expect(caller.settings.get(inputWithUnknownProperty)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
