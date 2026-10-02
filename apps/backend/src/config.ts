import { join } from "node:path"
import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import { MCP_PATH } from "@/server/mcp/plugin"

const DEFAULT_HOST = "localhost"
const DEFAULT_PORT = 3000

export interface ServerConfig {
  readonly host: string
  readonly port: number
}

const DATA_FOLDER_NAME = ".flightplan"

const parsePort = (rawPort: string | undefined): number => {
  const port = Number(rawPort)
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT
}

export const readServerConfig = (environment: Environment): ServerConfig => ({
  host: environment.HOST ?? DEFAULT_HOST,
  port: parsePort(environment.PORT),
})

export const readDataPath = (environment: Environment, homePath: string): string =>
  environment.FLIGHT_PLAN_DATA_DIR ?? join(homePath, DATA_FOLDER_NAME)

export const mcpUrlOf = (config: ServerConfig): string => `http://${config.host}:${String(config.port)}${MCP_PATH}`
