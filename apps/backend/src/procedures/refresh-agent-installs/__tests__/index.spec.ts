import { AT_CONFIGURATION, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP, type AgentInstall, type AgentName, type Setup } from "@/procedures/get-setup/utils/setup"
import type { AgentInstallation } from "@/procedures/get-setup/utils/setup-environment"
import { refreshAgentInstalls } from "@/procedures/refresh-agent-installs"

const INSTALLED: AgentInstallation = { kind: "installed" }

const createInstallingContext = (setup: Setup, failures: Partial<Record<AgentName, string>> = {}, currentAgents: readonly AgentName[] = []) => {
  const context = createSetupContext(setup)
  const installAgent = vi.fn(async ({ agent }: AgentInstall): Promise<AgentInstallation> => {
    const reason = failures[agent]
    return await Promise.resolve(reason === undefined ? INSTALLED : { kind: "failed", reason })
  })
  const isAgentInstallCurrent = async ({ agent }: AgentInstall): Promise<boolean> => await Promise.resolve(currentAgents.includes(agent))
  return { installAgent, context: { ...context, setupEnvironment: { ...context.setupEnvironment, installAgent, isAgentInstallCurrent } } }
}

describe("refreshAgentInstalls", () => {
  it("installs again only the saved agents whose install is out of date", async () => {
    const { context, installAgent } = createInstallingContext(AT_CONFIGURATION, {}, ["codex"])

    await expect(refreshAgentInstalls(context)).resolves.toStrictEqual([])
    expect(installAgent.mock.calls.map(([{ agent }]) => agent)).toStrictEqual(["claude"])
  })

  it("installs every saved agent again when none is up to date", async () => {
    const { context, installAgent } = createInstallingContext(AT_CONFIGURATION)

    await expect(refreshAgentInstalls(context)).resolves.toStrictEqual([])
    expect(installAgent.mock.calls.map(([{ agent, installPath }]) => ({ agent, installPath }))).toStrictEqual([
      { agent: "claude", installPath: "/Users/dev/.claude" },
      { agent: "codex", installPath: "/Users/dev/.codex" },
    ])
  })

  it("installs nothing before any agent is saved", async () => {
    const { context, installAgent } = createInstallingContext(EMPTY_SETUP)

    await expect(refreshAgentInstalls(context)).resolves.toStrictEqual([])
    expect(installAgent).not.toHaveBeenCalled()
  })

  it("names each agent that could not be installed, with the reason", async () => {
    const { context } = createInstallingContext(AT_CONFIGURATION, { codex: "config.toml in that folder is not valid TOML." })

    await expect(refreshAgentInstalls(context)).resolves.toStrictEqual([
      { agent: "codex", reason: "config.toml in that folder is not valid TOML." },
    ])
  })
})
