import { execFile } from "node:child_process"
import { constants } from "node:fs"
import { access, readFile, rm, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { AsyncEntry, findCredentialsAsync } from "@napi-rs/keyring"
import {
  claudeCommandEnvironment,
  CLAUDE_CLI_NAME,
  CLAUDE_UNINSTALL_COMMANDS,
  CODEX_CONFIG_NAME,
  CURSOR_CONFIG_NAME,
  dataPathOf,
  executableCandidates,
  installsToReset,
  KEYCHAIN_SERVICE,
  SETTINGS_PATH,
  SKILL_PATH,
  withoutCodexMcpServer,
  withoutCursorMcpServer,
  type AgentInstall,
  type AgentName,
  type Environment,
} from "./utils/reset-plan"

interface Machine {
  readonly homePath: string
  readonly environment: Environment
}

type AgentResetter = (install: AgentInstall, machine: Machine) => Promise<readonly string[]>

const readTextOrNull = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, "utf8")
  } catch {
    return null
  }
}

const isExecutable = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

const findExecutable = async (name: string, machine: Machine): Promise<string | null> => {
  const candidates = executableCandidates(name, machine.homePath, machine.environment)
  const checks = await Promise.all(candidates.map(isExecutable))
  return candidates.find((_candidate, index) => checks[index]) ?? null
}

const lastLineOf = (text: string): string => text.trim().split("\n").at(-1) ?? ""

const runClaude = async (
  executable: string,
  commandArguments: readonly string[],
  environment: Environment,
): Promise<string> =>
  await new Promise((resolve) => {
    execFile(executable, [...commandArguments], { env: { ...environment } }, (error, output, errorOutput) => {
      const outcome = lastLineOf(error === null ? output : errorOutput)
      resolve(`${CLAUDE_CLI_NAME} ${commandArguments.join(" ")}: ${outcome}`)
    })
  })

const resetClaude: AgentResetter = async (install, machine) => {
  const executable = await findExecutable(CLAUDE_CLI_NAME, machine)
  if (executable === null) return [`Skipped ${install.installPath}: the ${CLAUDE_CLI_NAME} command was not found.`]
  const environment = claudeCommandEnvironment(install.installPath, machine.homePath, machine.environment)
  const [uninstallPlugin, removeMarketplace] = CLAUDE_UNINSTALL_COMMANDS
  const pluginReport = await runClaude(executable, uninstallPlugin, environment)
  const marketplaceReport = await runClaude(executable, removeMarketplace, environment)
  return [pluginReport, marketplaceReport].map((report) => `${install.installPath}: ${report}`)
}

const removeMcpServer = async (configPath: string, withoutMcpServer: (config: string) => string | null): Promise<string> => {
  const config = await readTextOrNull(configPath)
  const rewritten = config === null ? null : withoutMcpServer(config)
  if (rewritten === null) return `No Flight Plan server in ${configPath}`
  await writeFile(configPath, rewritten)
  return `Removed the Flight Plan server from ${configPath}`
}

const resetFiles = (configName: string, withoutMcpServer: (config: string) => string | null): AgentResetter =>
  async (install) => {
    const skillPath = join(install.installPath, ...SKILL_PATH)
    await rm(skillPath, { recursive: true, force: true })
    return [await removeMcpServer(join(install.installPath, configName), withoutMcpServer), `Removed ${skillPath}`]
  }

const RESETTERS: Record<AgentName, AgentResetter> = {
  claude: resetClaude,
  codex: resetFiles(CODEX_CONFIG_NAME, withoutCodexMcpServer),
  cursor: resetFiles(CURSOR_CONFIG_NAME, withoutCursorMcpServer),
}

const deleteForgeTokens = async (): Promise<string> => {
  try {
    const credentials = await findCredentialsAsync(KEYCHAIN_SERVICE)
    await Promise.all(
      credentials.map(async ({ account }) => await new AsyncEntry(KEYCHAIN_SERVICE, account).deletePassword()),
    )
    return `Deleted ${String(credentials.length)} forge tokens from the system keychain`
  } catch (error) {
    return `The system keychain could not be cleared: ${error instanceof Error ? error.message : String(error)}`
  }
}

const hardReset = async (machine: Machine): Promise<readonly string[]> => {
  const dataPath = dataPathOf(machine.homePath, machine.environment)
  const settings = await readTextOrNull(join(dataPath, ...SETTINGS_PATH))
  const installs = installsToReset(settings, machine.homePath, machine.environment)
  const agentReports = await Promise.all(
    installs.map(async (install) => await RESETTERS[install.agent](install, machine)),
  )
  const keychainReport = await deleteForgeTokens()
  await rm(dataPath, { recursive: true, force: true })
  return [...agentReports.flat(), keychainReport, `Removed ${dataPath}`]
}

hardReset({ homePath: homedir(), environment: process.env })
  .then((reports) => {
    console.log(reports.join("\n"))
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
