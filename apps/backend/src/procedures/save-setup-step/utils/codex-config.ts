import { parse } from "smol-toml"
import { MCP_SERVER_NAME } from "./flightplan-server"

const SERVER_TABLE = new RegExp(String.raw`^\[mcp_servers\.${MCP_SERVER_NAME}\][^\n]*\n?(?:(?!\[)[^\n]*\n?)*`, "mu")

const serverTable = (mcpUrl: string): string => `[mcp_servers.${MCP_SERVER_NAME}]\nurl = ${JSON.stringify(mcpUrl)}\n`

const isToml = (text: string): boolean => {
  try {
    parse(text)
    return true
  } catch {
    return false
  }
}

export const withCodexMcpServer = (config: string | null, mcpUrl: string): string | null => {
  const otherSettings = (config ?? "").replace(SERVER_TABLE, "").trimEnd()
  const merged = otherSettings === "" ? serverTable(mcpUrl) : `${otherSettings}\n\n${serverTable(mcpUrl)}`
  return isToml(merged) ? merged : null
}
