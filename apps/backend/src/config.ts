import { join } from "node:path"
import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import { MCP_PATH } from "@/server/mcp/plugin"

export const DEFAULT_HOST = "localhost"
export const DEVELOPMENT_PORT = 3000
export const PUBLISHED_PORT = 24747

const HIGHEST_PORT = 65_535

export interface ServerConfig {
  readonly host: string
  readonly port: number
}

const DATA_FOLDER_NAME = ".flightplan"

export const parsePort = (rawPort: string | undefined): number | null => {
  const port = Number(rawPort)
  return Number.isInteger(port) && port > 0 && port <= HIGHEST_PORT ? port : null
}

export const readHost = (environment: Environment): string => environment.HOST ?? DEFAULT_HOST

export const readRequestedPort = (environment: Environment): number | null => parsePort(environment.PORT)

export const readDataPath = (environment: Environment, homePath: string): string =>
  environment.FLIGHT_PLAN_DATA_DIR ?? join(homePath, DATA_FOLDER_NAME)

export const serverUrlOf = (config: ServerConfig): string => `http://${config.host}:${String(config.port)}`

export const mcpUrlOf = (config: ServerConfig): string => `${serverUrlOf(config)}${MCP_PATH}`

export interface PortChoice {
  readonly requestedPort: number | null
  readonly savedPort: number | null
}

export const preferredPortOf = ({ requestedPort, savedPort }: PortChoice): number =>
  requestedPort ?? savedPort ?? PUBLISHED_PORT

export type PortPlan
  = | { readonly kind: "listen", readonly port: number }
    | { readonly kind: "find-free-port" }
    | { readonly kind: "refuse", readonly message: string }

const takenPortMessage = (port: number): string =>
  `Port ${String(port)} is in use by another program. Choose another one with --port.`

export const planPort = (choice: PortChoice, isPreferredPortFree: boolean): PortPlan => {
  if (isPreferredPortFree) return { kind: "listen", port: preferredPortOf(choice) }
  return choice.requestedPort === null
    ? { kind: "find-free-port" }
    : { kind: "refuse", message: takenPortMessage(choice.requestedPort) }
}
