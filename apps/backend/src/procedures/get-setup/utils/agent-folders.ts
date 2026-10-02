import { join } from "node:path"
import type { AgentName } from "./setup"

export type Environment = Readonly<Record<string, string | undefined>>

export interface AgentFolder {
  readonly agent: AgentName
  readonly path: string
}

const CLAUDE_FOLDER_NAME = ".claude"
const CODEX_FOLDER_NAME = ".codex"
const CURSOR_FOLDER_NAME = ".cursor"

const folderOr = (configuredPath: string | undefined, defaultPath: string): string =>
  configuredPath === undefined || configuredPath === "" ? defaultPath : configuredPath

export const agentFolders = (homePath: string, environment: Environment): readonly AgentFolder[] => [
  { agent: "claude", path: folderOr(environment.CLAUDE_CONFIG_DIR, join(homePath, CLAUDE_FOLDER_NAME)) },
  { agent: "codex", path: folderOr(environment.CODEX_HOME, join(homePath, CODEX_FOLDER_NAME)) },
  { agent: "cursor", path: join(homePath, CURSOR_FOLDER_NAME) },
]

const AGENT_ENTRY_NAMES: Record<AgentName, readonly string[]> = {
  claude: ["settings.json", "history.jsonl", "shell-snapshots", "session-env"],
  codex: ["auth.json", "config.toml", "installation_id"],
  cursor: ["cli-config.json", "argv.json", "mcp.json", "skills-cursor"],
}

export const isAgentFolder = (agent: AgentName, entryNames: readonly string[]): boolean =>
  AGENT_ENTRY_NAMES[agent].some((entryName) => entryNames.includes(entryName))
