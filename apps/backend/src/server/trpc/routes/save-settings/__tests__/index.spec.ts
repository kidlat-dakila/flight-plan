import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("settings.save route", () => {
  it("delegates to the save-settings procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))

    await expect(caller.settings.save({ section: "configuration", configurationId: "standard" })).resolves.toStrictEqual({
      kind: "saved",
      message: "Your default configuration is saved.",
    })
  })

  it("returns a rejected save as data, with the field it is about", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))

    await expect(
      caller.settings.save({
        section: "agents",
        agents: [{ agent: "cursor", isPicked: true, installPath: "", model: "default", effort: "default" }],
        defaultAgent: null,
        connection: "direct",
      }),
    ).resolves.toStrictEqual({
      kind: "rejected",
      message: "Enter the full path of the folder where Cursor keeps its configuration.",
      field: { owner: "cursor", name: "installPath" },
    })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_REPOSITORIES))
    const inputWithUnknownProperty = { section: "configuration" as const, configurationId: "minimal" as const, step: "configuration" }

    await expect(caller.settings.save(inputWithUnknownProperty)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
