import { copyFile, mkdir, readdir, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { lastOf } from "@/procedures/get-review/utils/last-of"
import { AGENT_CLI_NAMES } from "@/procedures/get-setup/utils/agent-catalog"
import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { AgentInstall, AgentName } from "@/procedures/get-setup/utils/setup"
import type { AgentInstallation, SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import {
  buildMarketplaceManifest,
  buildMcpManifest,
  claudeCommandEnvironment,
  claudeInstallCommands,
  MARKETPLACE_MANIFEST_PATH,
  MCP_MANIFEST_NAME,
  PLUGIN_NAME,
} from "@/procedures/save-setup-step/utils/claude-plugin"
import { withCodexMcpServer } from "@/procedures/save-setup-step/utils/codex-config"
import { withCursorMcpServer } from "@/procedures/save-setup-step/utils/cursor-config"
import { renameSkill } from "@/procedures/save-setup-step/utils/skill-file"
import { createExecutableFinder } from "@/utils/executable-finder"
import type { CommandRunner } from "@/utils/run-command"
import { readTextOrNull, writeText } from "@/utils/text-file"

export interface AgentInstallerOptions {
  readonly pluginPath: string
  readonly dataPath: string
  readonly mcpUrl: string
  readonly homePath: string
  readonly environment: Environment
  readonly runCommand: CommandRunner
}

interface ConfigFile {
  readonly name: string
  readonly withMcpServer: (config: string | null, mcpUrl: string) => string | null
  readonly invalidReason: string
}

type AgentInstaller = (install: AgentInstall, options: AgentInstallerOptions) => Promise<AgentInstallation>

const MARKETPLACE_FOLDER_NAME = "agent-plugin"
const SKILL_SOURCE_PATH = ["skills", "review"] as const
const SKILL_NAME = "flightplan-review"
const SKILLS_FOLDER_NAME = "skills"
const SKILL_FILE_NAME = "SKILL.md"
const JSON_INDENT = 2
const SUCCESS_EXIT_CODE = 0

const INSTALLED: AgentInstallation = { kind: "installed" }
const CLAUDE_MISSING_REASON = "The claude command was not found on this machine."
const UNWRITABLE_REASON = "Its files could not be written."

const CODEX_CONFIG: ConfigFile = {
  name: "config.toml",
  withMcpServer: withCodexMcpServer,
  invalidReason: "config.toml in that folder is not valid TOML.",
}

const CURSOR_CONFIG: ConfigFile = {
  name: "mcp.json",
  withMcpServer: withCursorMcpServer,
  invalidReason: "mcp.json in that folder is not valid JSON.",
}

const failed = (reason: string): AgentInstallation => ({ kind: "failed", reason })

const formatJson = (manifest: unknown): string => `${JSON.stringify(manifest, null, JSON_INDENT)}\n`

const lastLineOf = (text: string): string => lastOf(text.trim().split("\n")) ?? ""

const commandFailure = (errorOutput: string): AgentInstallation =>
  failed(`The claude command reported: ${lastLineOf(errorOutput)}`)

const copyFolder = async (sourcePath: string, targetPath: string): Promise<void> => {
  await mkdir(targetPath, { recursive: true })
  const entries = await readdir(sourcePath, { withFileTypes: true })
  await Promise.all(
    entries.map(async (entry) => {
      const copy = entry.isDirectory() ? copyFolder : copyFile
      await copy(join(sourcePath, entry.name), join(targetPath, entry.name))
    }),
  )
}

const writeMarketplace = async (marketplacePath: string, options: AgentInstallerOptions): Promise<void> => {
  const pluginPath = join(marketplacePath, PLUGIN_NAME)
  await rm(pluginPath, { recursive: true, force: true })
  await copyFolder(options.pluginPath, pluginPath)
  await writeText(join(pluginPath, MCP_MANIFEST_NAME), formatJson(buildMcpManifest(options.mcpUrl)))
  await writeText(join(marketplacePath, ...MARKETPLACE_MANIFEST_PATH), formatJson(buildMarketplaceManifest()))
}

const runUntilFailure = async (
  run: (commandArguments: readonly string[]) => Promise<AgentInstallation>,
  commands: readonly (readonly string[])[],
): Promise<AgentInstallation> => {
  const [command, ...laterCommands] = commands
  if (commands.length === 0) return INSTALLED
  const installation = await run(command)
  return installation.kind === "failed" ? installation : await runUntilFailure(run, laterCommands)
}

const installClaudePlugin: AgentInstaller = async (install, options) => {
  const marketplacePath = join(options.dataPath, MARKETPLACE_FOLDER_NAME)
  const executable = await createExecutableFinder(options)(AGENT_CLI_NAMES.claude)
  if (executable === null) return failed(CLAUDE_MISSING_REASON)
  await writeMarketplace(marketplacePath, options)
  const environment = claudeCommandEnvironment(install.installPath, options.homePath, options.environment)
  const run = async (commandArguments: readonly string[]): Promise<AgentInstallation> => {
    const outcome = await options.runCommand(executable, commandArguments, environment)
    return outcome.exitCode === SUCCESS_EXIT_CODE ? INSTALLED : commandFailure(outcome.errorOutput)
  }
  return await runUntilFailure(run, claudeInstallCommands(marketplacePath))
}

const copySkill = async (installPath: string, options: AgentInstallerOptions): Promise<void> => {
  const skillPath = join(installPath, SKILLS_FOLDER_NAME, SKILL_NAME)
  const skillFilePath = join(skillPath, SKILL_FILE_NAME)
  await rm(skillPath, { recursive: true, force: true })
  await copyFolder(join(options.pluginPath, ...SKILL_SOURCE_PATH), skillPath)
  await writeText(skillFilePath, renameSkill(await readFile(skillFilePath, "utf8"), SKILL_NAME))
}

const installFiles = (configFile: ConfigFile): AgentInstaller => async (install, options) => {
  const configPath = join(install.installPath, configFile.name)
  const config = configFile.withMcpServer(await readTextOrNull(configPath), options.mcpUrl)
  if (config === null) return failed(configFile.invalidReason)
  await copySkill(install.installPath, options)
  await writeText(configPath, config)
  return INSTALLED
}

const INSTALLERS: Record<AgentName, AgentInstaller> = {
  claude: installClaudePlugin,
  codex: installFiles(CODEX_CONFIG),
  cursor: installFiles(CURSOR_CONFIG),
}

export const createAgentInstaller = (options: AgentInstallerOptions): SetupEnvironment["installAgent"] =>
  async (install) => {
    try {
      return await INSTALLERS[install.agent](install, options)
    } catch {
      return failed(UNWRITABLE_REASON)
    }
  }
