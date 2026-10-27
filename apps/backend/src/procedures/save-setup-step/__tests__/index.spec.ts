import {
  AT_AGENTS,
  AT_CONFIGURATION,
  AT_FORGES,
  CHECKOUT_WEB,
  createSetupContext,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import type { CredentialSaving, SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { saveSetupStep } from "@/procedures/save-setup-step"
import type { SaveSetupStepInput } from "@/procedures/save-setup-step/utils/schemas"

const AGENTS_INPUT: SaveSetupStepInput = {
  step: "agents",
  agents: [{ agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "default", effort: "default" }],
  defaultAgent: null,
  terminalApp: null,
}

const GITHUB_TOKEN_INPUT: SaveSetupStepInput = {
  step: "forges",
  forges: [{ forge: "github", isPicked: true, username: "", token: "secret", baseUrl: "" }],
}

describe("saveSetupStep", () => {
  it("moves on from the repositories once they are ready, and changes nothing", async () => {
    const context = createSetupContext(AT_FORGES)

    await expect(saveSetupStep({ step: "repositories" }, context)).resolves.toStrictEqual({
      kind: "accepted",
      nextStep: "forges",
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_FORGES)
  })

  it("holds the repositories step until a repository is added", async () => {
    await expect(saveSetupStep({ step: "repositories" }, createSetupContext(EMPTY_SETUP))).resolves.toStrictEqual({
      kind: "rejected",
      message: "Add at least one repository.",
      field: null,
    })
  })

  it("passes the repositories step on local git with nobody picked", async () => {
    const withoutSelf = { ...EMPTY_SETUP, repositories: [CHECKOUT_WEB] }

    await expect(saveSetupStep({ step: "repositories" }, createSetupContext(withoutSelf))).resolves.toStrictEqual({
      kind: "accepted",
      nextStep: "forges",
    })
  })

  it("saves the agents and names the next step", async () => {
    const context = createSetupContext(AT_AGENTS)

    await expect(saveSetupStep(AGENTS_INPUT, context)).resolves.toStrictEqual({ kind: "accepted", nextStep: "configuration" })
    await expect(context.setupStore.read()).resolves.toMatchObject({
      agents: { defaultAgent: "claude" },
      defaultConfiguration: null,
    })
  })

  it("saves the terminal app picked with the agents", async () => {
    const context = createSetupContext(AT_AGENTS)

    await expect(saveSetupStep({ ...AGENTS_INPUT, terminalApp: "iterm" }, context)).resolves.toMatchObject({ kind: "accepted" })
    await expect(context.setupStore.read()).resolves.toMatchObject({ agents: { terminalApp: "iterm" } })
  })

  it("rejects a terminal app that is not installed and saves nothing", async () => {
    const context = createSetupContext(AT_AGENTS)

    await expect(saveSetupStep({ ...AGENTS_INPUT, terminalApp: "warp" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Warp is not installed on this machine. Pick another terminal app.",
      field: { owner: "terminal", name: "terminalApp" },
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_AGENTS)
  })

  it("leaves the stored setup unchanged when a step is rejected", async () => {
    const context = createSetupContext(AT_AGENTS)
    const input: SaveSetupStepInput = { ...AGENTS_INPUT, agents: [] }

    await expect(saveSetupStep(input, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Pick at least one agent.",
      field: null,
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_AGENTS)
  })

  it("rejects a model the agent does not list and saves nothing", async () => {
    const context = createSetupContext(AT_AGENTS)
    const input: SaveSetupStepInput = {
      ...AGENTS_INPUT,
      agents: [{ agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "gpt", effort: "default" }],
    }

    await expect(saveSetupStep(input, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Choose one of the models Claude offers.",
      field: { owner: "claude", name: "model" },
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_AGENTS)
  })

  it("installs Flight Plan for each picked agent before saving", async () => {
    const installAgent = vi.fn<SetupEnvironment["installAgent"]>().mockResolvedValue({ kind: "installed" })
    const baseContext = createSetupContext(AT_AGENTS)
    const context = { ...baseContext, setupEnvironment: { ...baseContext.setupEnvironment, installAgent } }

    await saveSetupStep(AGENTS_INPUT, context)

    expect(installAgent.mock.calls).toStrictEqual([[{ agent: "claude", installPath: "/Users/dev/.claude", model: "default", effort: "default" }]])
  })

  it("rejects the agents and saves nothing when an install fails", async () => {
    const installAgent = vi
      .fn<SetupEnvironment["installAgent"]>()
      .mockResolvedValue({ kind: "failed", reason: "The claude command was not found on this machine." })
    const baseContext = createSetupContext(AT_AGENTS)
    const context = { ...baseContext, setupEnvironment: { ...baseContext.setupEnvironment, installAgent } }

    await expect(saveSetupStep(AGENTS_INPUT, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Flight Plan could not be installed for Claude. The claude command was not found on this machine.",
      field: { owner: "claude", name: "installPath" },
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(AT_AGENTS)
  })

  it("rejects an install folder that is not the agent's and installs nothing", async () => {
    const installAgent = vi.fn<SetupEnvironment["installAgent"]>().mockResolvedValue({ kind: "installed" })
    const baseContext = createSetupContext(AT_AGENTS)
    const context = { ...baseContext, setupEnvironment: { ...baseContext.setupEnvironment, installAgent } }
    const input: SaveSetupStepInput = {
      ...AGENTS_INPUT,
      agents: [{ agent: "claude", isPicked: true, installPath: "/Users/dev/projects", model: "default", effort: "default" }],
    }

    await expect(saveSetupStep(input, context)).resolves.toMatchObject({
      kind: "rejected",
      field: { owner: "claude", name: "installPath" },
    })
    expect(installAgent).not.toHaveBeenCalled()
  })

  it("rejects an agent whose command line program is missing and installs nothing", async () => {
    const installAgent = vi.fn<SetupEnvironment["installAgent"]>().mockResolvedValue({ kind: "installed" })
    const hasAgentCli = vi.fn<SetupEnvironment["hasAgentCli"]>().mockResolvedValue(false)
    const baseContext = createSetupContext(AT_AGENTS)
    const context = { ...baseContext, setupEnvironment: { ...baseContext.setupEnvironment, installAgent, hasAgentCli } }

    await expect(saveSetupStep(AGENTS_INPUT, context)).resolves.toMatchObject({
      kind: "rejected",
      field: { owner: "claude", name: "cli" },
    })
    expect(installAgent).not.toHaveBeenCalled()
  })

  it("refuses a step whose earlier steps are not saved", async () => {
    const context = createSetupContext(EMPTY_SETUP)

    await expect(saveSetupStep({ step: "configuration", configurationId: "minimal" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Finish the earlier steps of the setup first.",
      field: null,
    })
  })

  it("hands a forge token to the credential store and keeps it out of the stored setup", async () => {
    const saveForgeCredential = vi
      .fn<(forge: string, token: string) => Promise<CredentialSaving>>()
      .mockResolvedValue({ kind: "saved" })
    const baseContext = createSetupContext(AT_FORGES)
    const context = { ...baseContext, setupEnvironment: { ...baseContext.setupEnvironment, saveForgeCredential } }

    await expect(saveSetupStep(GITHUB_TOKEN_INPUT, context)).resolves.toStrictEqual({
      kind: "accepted",
      nextStep: "agents",
    })
    expect(saveForgeCredential.mock.calls).toStrictEqual([["github", "secret"]])
    expect(JSON.stringify(await context.setupStore.read())).not.toContain("secret")
  })

  it("rejects the step and saves nothing when the keychain refuses the token", async () => {
    const saveForgeCredential = vi
      .fn<(forge: string, token: string) => Promise<CredentialSaving>>()
      .mockResolvedValue({ kind: "failed", reason: "The system keychain refused it: locked" })
    const baseContext = createSetupContext(AT_FORGES)
    const context = { ...baseContext, setupEnvironment: { ...baseContext.setupEnvironment, saveForgeCredential } }

    await expect(saveSetupStep(GITHUB_TOKEN_INPUT, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "The token for GitHub token could not be saved. The system keychain refused it: locked",
      field: { owner: "github", name: "token" },
    })
    expect((await context.setupStore.read()).forges).toBeNull()
  })

  it("rejects a command line forge the machine does not have", async () => {
    const input: SaveSetupStepInput = {
      step: "forges",
      forges: [{ forge: "glab", isPicked: true, username: "", token: "", baseUrl: "" }],
    }

    await expect(saveSetupStep(input, createSetupContext(AT_FORGES))).resolves.toStrictEqual({
      kind: "rejected",
      message: "GitLab CLI cannot be used. glab is not installed on this machine.",
      field: null,
    })
  })

  it("saves the default configuration and stays on the last step", async () => {
    const context = createSetupContext(AT_CONFIGURATION)

    await expect(saveSetupStep({ step: "configuration", configurationId: "onboardee" }, context)).resolves.toStrictEqual({
      kind: "accepted",
      nextStep: "configuration",
    })
    await expect(context.setupStore.read()).resolves.toMatchObject({ defaultConfiguration: "onboardee" })
  })
})
