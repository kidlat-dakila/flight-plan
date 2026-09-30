import { readServerConfig } from "./config"
import { buildServer } from "./server"

const start = async (): Promise<void> => {
  const { host, port } = readServerConfig(process.env)
  const server = await buildServer({ logger: true })
  await server.listen({ host, port })
}

start().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
