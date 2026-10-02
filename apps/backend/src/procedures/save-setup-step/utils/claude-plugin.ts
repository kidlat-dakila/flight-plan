import { agentFolders, type Environment } from "@/procedures/get-setup/utils/agent-folders"
import { MCP_SERVER_NAME } from "./flightplan-server"

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
