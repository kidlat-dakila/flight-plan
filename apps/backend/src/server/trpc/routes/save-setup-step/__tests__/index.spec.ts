import { AT_AGENTS, AT_CONFIGURATION, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { appRouter } from "@/server/trpc/router"

describe("setup.saveStep route", () => {
  it("delegates to the save-setup-step procedure", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_CONFIGURATION))

    await expect(caller.setup.saveStep({ step: "configuration", configurationId: "minimal" })).resolves.toStrictEqual({
      kind: "accepted",
      nextStep: "configuration",
    })
  })

  it("returns a rejected step as data, with the field it is about", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_AGENTS))

    await expect(
      caller.setup.saveStep({
        step: "agents",
        agents: [{ agent: "cursor", isPicked: true, installPath: "", model: "default", effort: "default" }],
        defaultAgent: null,
      }),
    ).resolves.toStrictEqual({
      kind: "rejected",
      message: "Enter the full path of the folder where Cursor keeps its configuration.",
      field: { owner: "cursor", name: "installPath" },
    })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(createSetupContext(AT_CONFIGURATION))
    const inputWithUnknownProperty = { step: "configuration" as const, configurationId: "minimal" as const, isComplete: true }

    await expect(caller.setup.saveStep(inputWithUnknownProperty)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
