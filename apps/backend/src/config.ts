const DEFAULT_HOST = "localhost"
const DEFAULT_PORT = 3000

export interface ServerConfig {
  readonly host: string
  readonly port: number
}

type Environment = Readonly<Record<string, string | undefined>>

const parsePort = (rawPort: string | undefined): number => {
  const port = Number(rawPort)
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT
}

export const readServerConfig = (environment: Environment): ServerConfig => ({
  host: environment.HOST ?? DEFAULT_HOST,
  port: parsePort(environment.PORT),
})
