import { homedir } from "node:os"
import { join } from "node:path"
import { mcpUrlOf, readDataPath, readServerConfig, serverUrlOf } from "./config"
import { createLocalProcedureContext } from "./procedures/context"
import { buildServer } from "./server"

const PLUGIN_FOLDER_NAME = "plugin"
const CONFIGURATIONS_FOLDER_NAME = "configurations"

const start = async (): Promise<void> => {
  const environment = process.env
  const homePath = homedir()
  const serverConfig = readServerConfig(environment)
  const context = createLocalProcedureContext(new Date(), {
    dataPath: readDataPath(environment, homePath),
    pluginPath: join(__dirname, PLUGIN_FOLDER_NAME),
    configurationsPath: join(__dirname, CONFIGURATIONS_FOLDER_NAME),
    mcpUrl: mcpUrlOf(serverConfig),
    serverUrl: serverUrlOf(serverConfig),
    homePath,
    environment,
  })
  const server = await buildServer({ logger: true }, context)
  await server.listen(serverConfig)
}

start().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
