import { MCP_SERVER_NAME } from "./flightplan-server"

type JsonObject = Readonly<Record<string, unknown>>

const EMPTY_CONFIG = "{}"
const JSON_INDENT = 2

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

const serversOf = (config: JsonObject): JsonObject => (isJsonObject(config.mcpServers) ? config.mcpServers : {})

export const withCursorMcpServer = (config: string | null, mcpUrl: string): string | null => {
  const parsed = parseJsonObject(config === null || config.trim() === "" ? EMPTY_CONFIG : config)
  if (parsed === null) return null
  const merged = { ...parsed, mcpServers: { ...serversOf(parsed), [MCP_SERVER_NAME]: { url: mcpUrl } } }
  return `${JSON.stringify(merged, null, JSON_INDENT)}\n`
}
