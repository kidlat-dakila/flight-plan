import { delimiter, join } from "node:path"
import { z } from "zod"

export type Environment = Readonly<Record<string, string | undefined>>

const AGENT_NAMES = ["claude", "codex", "cursor"] as const

export type AgentName = (typeof AGENT_NAMES)[number]

export interface AgentInstall {
  readonly agent: AgentName
  readonly installPath: string
}

export const MCP_SERVER_NAME = "flightplan"
export const KEYCHAIN_SERVICE = "flightplan"
export const CLAUDE_CLI_NAME = "claude"
export const CODEX_CONFIG_NAME = "config.toml"
export const CURSOR_CONFIG_NAME = "mcp.json"
export const SKILL_PATH = ["skills", "flightplan-review"] as const
export const SETTINGS_PATH = ["configurations", "settings.json"] as const

export const CLAUDE_UNINSTALL_COMMANDS = [
  ["plugin", "uninstall", "flightplan@flightplan"],
  ["plugin", "marketplace", "remove", "flightplan"],
] as const

const DATA_FOLDER_NAME = ".flightplan"
const CLAUDE_FOLDER_NAME = ".claude"
const CODEX_FOLDER_NAME = ".codex"
const CURSOR_FOLDER_NAME = ".cursor"
const USER_PROGRAMS_FOLDER = [".local", "bin"] as const
const JSON_INDENT = 2

const CODEX_SERVER_TABLE = new RegExp(String.raw`^\[mcp_servers\.${MCP_SERVER_NAME}\][^\n]*\n?(?:(?!\[)[^\n]*\n?)*`, "mu")

const settingsSchema = z.object({
  setup: z.object({
    agents: z.object({
      installs: z.array(z.object({ agent: z.enum(AGENT_NAMES), installPath: z.string() })),
    }),
  }),
})

const jsonObjectSchema = z.record(z.string(), z.unknown())

const parseJsonOrNull = (text: string): unknown => {
  try {
    const parsed: unknown = JSON.parse(text)
    return parsed
  } catch {
    return null
  }
}

const jsonObjectOrNull = (json: unknown): Readonly<Record<string, unknown>> | null => {
  const parsed = jsonObjectSchema.safeParse(json)
  return parsed.success ? parsed.data : null
}

const folderOr = (configuredPath: string | undefined, defaultPath: string): string =>
  configuredPath === undefined || configuredPath === "" ? defaultPath : configuredPath

const claudeFolderOf = (homePath: string, environment: Environment): string =>
  folderOr(environment.CLAUDE_CONFIG_DIR, join(homePath, CLAUDE_FOLDER_NAME))

export const dataPathOf = (homePath: string, environment: Environment): string =>
  folderOr(environment.FLIGHT_PLAN_DATA_DIR, join(homePath, DATA_FOLDER_NAME))

const defaultInstalls = (homePath: string, environment: Environment): readonly AgentInstall[] => [
  { agent: "claude", installPath: claudeFolderOf(homePath, environment) },
  { agent: "codex", installPath: folderOr(environment.CODEX_HOME, join(homePath, CODEX_FOLDER_NAME)) },
  { agent: "cursor", installPath: join(homePath, CURSOR_FOLDER_NAME) },
]

const savedInstallsOf = (settings: string | null): readonly AgentInstall[] => {
  const parsed = settingsSchema.safeParse(parseJsonOrNull(settings ?? ""))
  return parsed.success ? parsed.data.setup.agents.installs : []
}

const installKeyOf = (install: AgentInstall): string => `${install.agent}:${install.installPath}`

export const installsToReset = (settings: string | null, homePath: string, environment: Environment): readonly AgentInstall[] => {
  const installs = [...defaultInstalls(homePath, environment), ...savedInstallsOf(settings)]
  const installKeys = installs.map(installKeyOf)
  return installs.filter((install, index) => installKeys.indexOf(installKeyOf(install)) === index)
}

export const withoutCursorMcpServer = (config: string): string | null => {
  const settings = jsonObjectOrNull(parseJsonOrNull(config))
  const servers = jsonObjectOrNull(settings?.mcpServers)
  if (settings === null || servers === null || !Object.hasOwn(servers, MCP_SERVER_NAME)) return null
  const otherServers = Object.fromEntries(Object.entries(servers).filter(([serverName]) => serverName !== MCP_SERVER_NAME))
  return `${JSON.stringify({ ...settings, mcpServers: otherServers }, null, JSON_INDENT)}\n`
}

export const withoutCodexMcpServer = (config: string): string | null => {
  if (!CODEX_SERVER_TABLE.test(config)) return null
  const otherSettings = config.replace(CODEX_SERVER_TABLE, "").trimEnd()
  return otherSettings === "" ? "" : `${otherSettings}\n`
}

export const claudeCommandEnvironment = (installPath: string, homePath: string, environment: Environment): Environment =>
  installPath === claudeFolderOf(homePath, environment) ? environment : { ...environment, CLAUDE_CONFIG_DIR: installPath }

const searchFolders = (searchPath: string | undefined): readonly string[] =>
  (searchPath ?? "").split(delimiter).filter((folder) => folder !== "")

export const executableCandidates = (name: string, homePath: string, environment: Environment): readonly string[] =>
  [...searchFolders(environment.PATH), join(homePath, ...USER_PROGRAMS_FOLDER)].map((folder) => join(folder, name))
