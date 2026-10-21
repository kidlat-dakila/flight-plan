import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { parse } from "smol-toml"
import type { AgentInstallation } from "@/procedures/get-setup/utils/setup-environment"
import { createAgentInstaller, type AgentInstallerOptions } from "@/utils/agent-installer"
import type { CommandOutcome, CommandRunner } from "@/utils/run-command"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const MCP_URL = "http://localhost:3000/mcp"
const SERVER_URL = "http://localhost:3000"
const EXECUTABLE_MODE = 0o755
const SKILL = "---\nname: review\ndescription: Use when reviewing\n---\n\n# Review\n"
const SUCCEEDED: CommandOutcome = { exitCode: 0, output: "", errorOutput: "" }
const INSTALLED: AgentInstallation = { kind: "installed" }

interface Machine {
  readonly options: AgentInstallerOptions
  readonly runCommand: ReturnType<typeof vi.fn<CommandRunner>>
  readonly homePath: string
  readonly dataPath: string
  readonly claudeExecutable: string
}

const createMachine = async (folder: string, outcome: CommandOutcome = SUCCEEDED): Promise<Machine> => {
  const homePath = join(folder, "home")
  const dataPath = join(folder, "data")
  const pluginPath = join(folder, "plugin")
  const binPath = join(folder, "bin")
  const claudeExecutable = join(binPath, "claude")
  const runCommand = vi.fn<CommandRunner>().mockResolvedValue(outcome)
  await mkdir(join(pluginPath, "skills", "review"), { recursive: true })
  await mkdir(join(pluginPath, ".claude-plugin"))
  await mkdir(binPath)
  await mkdir(homePath)
  await writeFile(join(pluginPath, "skills", "review", "SKILL.md"), SKILL)
  await writeFile(join(pluginPath, ".claude-plugin", "plugin.json"), "{\"name\":\"flightplan\"}")
  await writeFile(claudeExecutable, "")
  await chmod(claudeExecutable, EXECUTABLE_MODE)
  const options = { pluginPath, dataPath, mcpUrl: MCP_URL, serverUrl: SERVER_URL, homePath, environment: { PATH: binPath }, runCommand }
  return { options, runCommand, homePath, dataPath, claudeExecutable }
}

const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, "utf8"))

describe("createAgentInstaller", () => {
  it("writes the Claude marketplace and installs the plugin through the claude command", async () => {
    await withTemporaryFolder(async (folder) => {
      const machine = await createMachine(folder)
      const marketplacePath = join(machine.dataPath, "agent-plugin")

      const installation = await createAgentInstaller(machine.options)({ agent: "claude", installPath: join(machine.homePath, ".claude"), model: "default", effort: "default" })

      expect(installation).toStrictEqual(INSTALLED)
      await expect(readJson(join(marketplacePath, ".claude-plugin", "marketplace.json"))).resolves.toMatchObject({ name: "flightplan" })
      await expect(readJson(join(marketplacePath, "flightplan", ".mcp.json"))).resolves.toStrictEqual({
        mcpServers: { flightplan: { type: "http", url: MCP_URL } },
      })
      await expect(readFile(join(marketplacePath, "flightplan", "skills", "review", "SKILL.md"), "utf8")).resolves.toBe(SKILL)
      expect(machine.runCommand.mock.calls).toStrictEqual([
        [machine.claudeExecutable, ["plugin", "marketplace", "add", marketplacePath], machine.options.environment],
        [machine.claudeExecutable, ["plugin", "install", "flightplan@flightplan"], machine.options.environment],
      ])
    })
  })

  it("writes the plugin that only sessions Flight Plan starts load, outside the marketplace's plugin list", async () => {
    await withTemporaryFolder(async (folder) => {
      const machine = await createMachine(folder)
      const spawnPluginPath = join(machine.dataPath, "agent-plugin", "flightplan-spawn")

      await createAgentInstaller(machine.options)({ agent: "claude", installPath: join(machine.homePath, ".claude"), model: "default", effort: "default" })

      await expect(readJson(join(spawnPluginPath, ".claude-plugin", "plugin.json"))).resolves.toMatchObject({ name: "flightplan-spawn" })
      await expect(readJson(join(spawnPluginPath, "hooks", "hooks.json"))).resolves.toMatchObject({
        hooks: { Stop: [{ hooks: [{ type: "http", url: "http://localhost:3000/api/agent-hooks/stop" }] }] },
      })
      await expect(readJson(join(machine.dataPath, "agent-plugin", ".claude-plugin", "marketplace.json"))).resolves.toMatchObject({
        plugins: [{ name: "flightplan" }],
      })
    })
  })

  it("points the claude command at an install folder other than its own", async () => {
    await withTemporaryFolder(async (folder) => {
      const machine = await createMachine(folder)
      const installPath = join(folder, "elsewhere")

      await createAgentInstaller(machine.options)({ agent: "claude", installPath, model: "default", effort: "default" })

      expect(machine.runCommand.mock.calls[0]?.[2]).toStrictEqual({ ...machine.options.environment, CLAUDE_CONFIG_DIR: installPath })
    })
  })

  it("fails for Claude when the claude command is not on the machine", async () => {
    await withTemporaryFolder(async (folder) => {
      const machine = await createMachine(folder)
      const options = { ...machine.options, environment: {} }

      await expect(createAgentInstaller(options)({ agent: "claude", installPath: join(folder, "claude"), model: "default", effort: "default" })).resolves.toStrictEqual({
        kind: "failed",
        reason: "The claude command was not found on this machine.",
      })
      expect(machine.runCommand).not.toHaveBeenCalled()
    })
  })

  it("fails for Claude with what the claude command reported and stops there", async () => {
    await withTemporaryFolder(async (folder) => {
      const machine = await createMachine(folder, { exitCode: 1, output: "", errorOutput: "warming up\nMarketplace is not valid\n" })

      await expect(createAgentInstaller(machine.options)({ agent: "claude", installPath: join(folder, "claude"), model: "default", effort: "default" })).resolves.toStrictEqual({
        kind: "failed",
        reason: "The claude command reported: Marketplace is not valid",
      })
      expect(machine.runCommand).toHaveBeenCalledTimes(1)
    })
  })

  it("copies the skill into Codex under Flight Plan's name and adds the MCP server", async () => {
    await withTemporaryFolder(async (folder) => {
      const machine = await createMachine(folder)
      const installPath = join(machine.homePath, ".codex")
      await mkdir(installPath)
      await writeFile(join(installPath, "config.toml"), "model = \"gpt-5\"\n")

      const installation = await createAgentInstaller(machine.options)({ agent: "codex", installPath, model: "default", effort: "default" })

      expect(installation).toStrictEqual(INSTALLED)
      await expect(readFile(join(installPath, "skills", "flightplan-review", "SKILL.md"), "utf8")).resolves.toBe(
        SKILL.replace("name: review", "name: flightplan-review"),
      )
      expect(structuredClone(parse(await readFile(join(installPath, "config.toml"), "utf8")))).toStrictEqual({
        model: "gpt-5",
        mcp_servers: { flightplan: { url: MCP_URL } },
      })
      expect(machine.runCommand).not.toHaveBeenCalled()
    })
  })

  it("copies the skill into Cursor and adds the MCP server to a folder that has no configuration yet", async () => {
    await withTemporaryFolder(async (folder) => {
      const machine = await createMachine(folder)
      const installPath = join(machine.homePath, ".cursor")

      const installation = await createAgentInstaller(machine.options)({ agent: "cursor", installPath, model: "default", effort: "default" })

      expect(installation).toStrictEqual(INSTALLED)
      await expect(readFile(join(installPath, "skills", "flightplan-review", "SKILL.md"), "utf8")).resolves.toContain("name: flightplan-review")
      await expect(readJson(join(installPath, "mcp.json"))).resolves.toStrictEqual({ mcpServers: { flightplan: { url: MCP_URL } } })
    })
  })

  it("fails and leaves a damaged configuration as it was", async () => {
    await withTemporaryFolder(async (folder) => {
      const machine = await createMachine(folder)
      const installPath = join(machine.homePath, ".cursor")
      await mkdir(installPath)
      await writeFile(join(installPath, "mcp.json"), "{ broken")

      await expect(createAgentInstaller(machine.options)({ agent: "cursor", installPath, model: "default", effort: "default" })).resolves.toStrictEqual({
        kind: "failed",
        reason: "mcp.json in that folder is not valid JSON.",
      })
      await expect(readFile(join(installPath, "mcp.json"), "utf8")).resolves.toBe("{ broken")
    })
  })

  it("fails when the install folder cannot be written", async () => {
    await withTemporaryFolder(async (folder) => {
      const machine = await createMachine(folder)
      const installPath = join(folder, "a-file")
      await writeFile(installPath, "")

      await expect(createAgentInstaller(machine.options)({ agent: "codex", installPath, model: "default", effort: "default" })).resolves.toStrictEqual({
        kind: "failed",
        reason: "Its files could not be written.",
      })
    })
  })
})
