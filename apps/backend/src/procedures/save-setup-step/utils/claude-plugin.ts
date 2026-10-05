import { join } from "node:path"
import { agentFolders, type Environment } from "@/procedures/get-setup/utils/agent-folders"
import { MCP_SERVER_NAME } from "./flightplan-server"

export const MARKETPLACE_FOLDER_NAME = "agent-plugin"
export const MARKETPLACE_NAME = "flightplan"
export const PLUGIN_NAME = "flightplan"
export const MARKETPLACE_MANIFEST_PATH = [".claude-plugin", "marketplace.json"] as const
export const MCP_MANIFEST_NAME = ".mcp.json"

const MARKETPLACE_OWNER = "Flight Plan"
const PLUGIN_DESCRIPTION = "Write and maintain pull request walkthroughs with Flight Plan."
const MCP_TRANSPORT = "http"

export interface MarketplaceManifest {
  readonly name: string
  readonly owner: { readonly name: string }
  readonly plugins: readonly { readonly name: string, readonly source: string, readonly description: string }[]
}

export interface McpManifest {
  readonly mcpServers: Readonly<Record<string, { readonly type: string, readonly url: string }>>
}

export const buildMarketplaceManifest = (): MarketplaceManifest => ({
  name: MARKETPLACE_NAME,
  owner: { name: MARKETPLACE_OWNER },
  plugins: [{ name: PLUGIN_NAME, source: `./${PLUGIN_NAME}`, description: PLUGIN_DESCRIPTION }],
})

export const buildMcpManifest = (mcpUrl: string): McpManifest => ({
  mcpServers: { [MCP_SERVER_NAME]: { type: MCP_TRANSPORT, url: mcpUrl } },
})

export const claudeInstallCommands = (marketplacePath: string): readonly (readonly string[])[] => [
  ["plugin", "marketplace", "add", marketplacePath],
  ["plugin", "install", `${PLUGIN_NAME}@${MARKETPLACE_NAME}`],
]

const usesOwnFolder = (installPath: string, homePath: string, environment: Environment): boolean =>
  agentFolders(homePath, environment).some((folder) => folder.agent === "claude" && folder.path === installPath)

export const claudeCommandEnvironment = (installPath: string, homePath: string, environment: Environment): Environment =>
  usesOwnFolder(installPath, homePath, environment) ? environment : { ...environment, CLAUDE_CONFIG_DIR: installPath }

export const SPAWN_PLUGIN_NAME = "flightplan-spawn"
export const PLUGIN_MANIFEST_PATH = [".claude-plugin", "plugin.json"] as const
export const HOOKS_MANIFEST_PATH = ["hooks", "hooks.json"] as const

export const AGENT_HOOK_PATHS = {
  promptSubmit: "/api/agent-hooks/user-prompt-submit",
  postToolUse: "/api/agent-hooks/post-tool-use",
  permissionRequest: "/api/agent-hooks/permission-request",
  stop: "/api/agent-hooks/stop",
} as const

const SPAWN_PLUGIN_DESCRIPTION = "Connects a Claude session that Flight Plan started to Flight Plan's web app."
const HOOK_TYPE = "http"
const ALL_TOOLS_MATCHER = "*"
const QUICK_HOOK_TIMEOUT_SECONDS = 10
const STOP_HOOK_TIMEOUT_SECONDS = 30
export const PERMISSION_HOOK_TIMEOUT_SECONDS = 600

export interface PluginManifest {
  readonly name: string
  readonly description: string
}

interface HttpHook {
  readonly type: string
  readonly url: string
  readonly timeout: number
}

interface HookGroup {
  readonly matcher?: string
  readonly hooks: readonly HttpHook[]
}

export interface HooksManifest {
  readonly description: string
  readonly hooks: Readonly<Record<string, readonly HookGroup[]>>
}

export const spawnPluginPathOf = (dataPath: string): string => join(dataPath, MARKETPLACE_FOLDER_NAME, SPAWN_PLUGIN_NAME)

export const buildSpawnPluginManifest = (): PluginManifest => ({
  name: SPAWN_PLUGIN_NAME,
  description: SPAWN_PLUGIN_DESCRIPTION,
})

const httpHook = (serverUrl: string, path: string, timeout: number): HttpHook => ({
  type: HOOK_TYPE,
  url: `${serverUrl}${path}`,
  timeout,
})

export const buildSpawnHooksManifest = (serverUrl: string): HooksManifest => ({
  description: SPAWN_PLUGIN_DESCRIPTION,
  hooks: {
    UserPromptSubmit: [{ hooks: [httpHook(serverUrl, AGENT_HOOK_PATHS.promptSubmit, QUICK_HOOK_TIMEOUT_SECONDS)] }],
    PostToolUse: [
      { matcher: ALL_TOOLS_MATCHER, hooks: [httpHook(serverUrl, AGENT_HOOK_PATHS.postToolUse, QUICK_HOOK_TIMEOUT_SECONDS)] },
    ],
    PermissionRequest: [
      {
        matcher: ALL_TOOLS_MATCHER,
        hooks: [httpHook(serverUrl, AGENT_HOOK_PATHS.permissionRequest, PERMISSION_HOOK_TIMEOUT_SECONDS)],
      },
    ],
    Stop: [{ hooks: [httpHook(serverUrl, AGENT_HOOK_PATHS.stop, STOP_HOOK_TIMEOUT_SECONDS)] }],
  },
})
