import { AT_CONFIGURATION, AT_FORGES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { saveSetupStep } from "@/procedures/save-setup-step"
import type { SaveSetupStepInput } from "@/procedures/save-setup-step/utils/schemas"

const AGENTS_INPUT: SaveSetupStepInput = {
  step: "agents",
  agents: [{ agent: "claude", isPicked: true, installPath: "/Users/dev/.claude" }],
  defaultAgent: null,
  connection: "direct",
}

const GITHUB_TOKEN_INPUT: SaveSetupStepInput = {
  step: "forges",
  forges: [{ forge: "github", isPicked: true, username: "", token: "secret", baseUrl: "" }],
  defaultForge: null,
}

describe("saveSetupStep", () => {
  it("saves the agents and names the next step", async () => {
    const context = createSetupContext(EMPTY_SETUP)

    await expect(saveSetupStep(AGENTS_INPUT, context)).resolves.toStrictEqual({ kind: "accepted", nextStep: "forges" })
    await expect(context.setupStore.read()).resolves.toMatchObject({
      agents: { defaultAgent: "claude", connection: "direct" },
      forges: null,
    })
  })

  it("leaves the stored setup unchanged when a step is rejected", async () => {
    const context = createSetupContext(EMPTY_SETUP)
    const input: SaveSetupStepInput = { ...AGENTS_INPUT, agents: [] }

    await expect(saveSetupStep(input, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Pick at least one agent.",
      field: null,
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(EMPTY_SETUP)
  })

  it("refuses a step whose earlier steps are not saved", async () => {
    const context = createSetupContext(EMPTY_SETUP)

    await expect(saveSetupStep({ step: "configuration", preset: "minimal" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Finish the earlier steps of the setup first.",
      field: null,
    })
  })

  it("hands a forge token to the credential store and keeps it out of the stored setup", async () => {
    const saveForgeCredential = vi.fn<(forge: string, token: string) => Promise<void>>().mockResolvedValue()
    const baseContext = createSetupContext(AT_FORGES)
    const context = { ...baseContext, setupEnvironment: { ...baseContext.setupEnvironment, saveForgeCredential } }

    await expect(saveSetupStep(GITHUB_TOKEN_INPUT, context)).resolves.toStrictEqual({
      kind: "accepted",
      nextStep: "configuration",
    })
    expect(saveForgeCredential.mock.calls).toStrictEqual([["github", "secret"]])
    expect(JSON.stringify(await context.setupStore.read())).not.toContain("secret")
  })

  it("rejects a command line forge the machine does not have", async () => {
    const input: SaveSetupStepInput = {
      step: "forges",
      forges: [{ forge: "glab", isPicked: true, username: "", token: "", baseUrl: "" }],
      defaultForge: null,
    }

    await expect(saveSetupStep(input, createSetupContext(AT_FORGES))).resolves.toStrictEqual({
      kind: "rejected",
      message: "GitLab CLI cannot be used. glab is not installed on this machine.",
      field: null,
    })
  })

  it("saves the default configuration and moves to the repositories", async () => {
    const context = createSetupContext(AT_CONFIGURATION)

    await expect(saveSetupStep({ step: "configuration", preset: "onboardee" }, context)).resolves.toStrictEqual({
      kind: "accepted",
      nextStep: "repositories",
    })
    await expect(context.setupStore.read()).resolves.toMatchObject({ preset: "onboardee" })
  })
})
