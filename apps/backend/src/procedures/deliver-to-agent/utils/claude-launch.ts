import type { AgentLaunch } from "@/procedures/get-conversation/utils/conversation-environment"
import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import { DEFAULT_EFFORT, DEFAULT_MODEL } from "@/procedures/get-setup/utils/setup"
import { PLUGIN_NAME } from "@/procedures/save-setup-step/utils/claude-plugin"
import { MCP_SERVER_NAME } from "@/procedures/save-setup-step/utils/flightplan-server"

export const FLIGHT_PLAN_TOOLS_RULE = `mcp__plugin_${PLUGIN_NAME}_${MCP_SERVER_NAME}__*`

export const PROJECT_MCP_FILE_NAME = ".mcp.json"

type JsonObject = Readonly<Record<string, unknown>>

const isJsonObject = (parsed: unknown): parsed is JsonObject =>
  typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)

const parseJsonObject = (text: string): JsonObject | null => {
  try {
    const parsed: unknown = JSON.parse(text)
    return isJsonObject(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const projectMcpServerNames = (projectMcpFile: string | null): readonly string[] => {
  const config = projectMcpFile === null ? null : parseJsonObject(projectMcpFile)
  return config !== null && isJsonObject(config.mcpServers) ? Object.keys(config.mcpServers) : []
}

const disabledProjectMcpArguments = (projectMcpServers: readonly string[]): readonly string[] =>
  projectMcpServers.length === 0
    ? []
    : ["--settings", JSON.stringify({ disabledMcpjsonServers: projectMcpServers })]

export const claudeLaunchArguments = (
  launch: AgentLaunch,
  spawnPluginPath: string,
  projectMcpServers: readonly string[],
): readonly string[] => [
  ...(launch.isResume ? ["--resume", launch.sessionId] : ["--session-id", launch.sessionId]),
  "--plugin-dir",
  spawnPluginPath,
  ...(launch.model === DEFAULT_MODEL ? [] : ["--model", launch.model]),
  "--allowedTools",
  FLIGHT_PLAN_TOOLS_RULE,
  ...disabledProjectMcpArguments(projectMcpServers),
  "--append-system-prompt",
  launch.instructions,
  launch.prompt,
]

const PARENT_SESSION_VARIABLES: ReadonlySet<string> = new Set([
  "CLAUDECODE",
  "CLAUDE_AGENT_SDK_VERSION",
  "CLAUDE_CODE_CHILD_SESSION",
  "CLAUDE_CODE_EMIT_STARTUP_TIMING",
  "CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING",
  "CLAUDE_CODE_ENABLE_TASKS",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_EXECPATH",
  "CLAUDE_CODE_MESSAGING_SOCKET",
  "CLAUDE_CODE_MESSAGING_TOKEN",
  "CLAUDE_CODE_QUESTION_PREVIEW_FORMAT",
  "CLAUDE_CODE_SESSION_ATTENDED",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_EFFORT",
  "CLAUDE_PID",
  "MCP_CONNECTION_NONBLOCKING",
])

const FORCE_SESSION_PERSISTENCE = { CLAUDE_CODE_FORCE_SESSION_PERSISTENCE: "1" } as const

const EFFORT_VARIABLE = "CLAUDE_CODE_EFFORT_LEVEL"

export const withoutParentSession = (environment: Environment): Environment =>
  Object.fromEntries(Object.entries(environment).filter(([name]) => !PARENT_SESSION_VARIABLES.has(name)))

export const spawnEnvironmentOf = (environment: Environment, effort: string): Environment => ({
  ...withoutParentSession(environment),
  ...FORCE_SESSION_PERSISTENCE,
  ...(effort === DEFAULT_EFFORT ? {} : { [EFFORT_VARIABLE]: effort }),
})
