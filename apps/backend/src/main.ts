import { homedir } from "node:os"
import { join } from "node:path"
import { mcpUrlOf, readDataPath, readServerConfig, serverUrlOf } from "./config"
import { createLocalProcedureContext, type ProcedureContext } from "./procedures/context"
import { buildServer } from "./server"

const PLUGIN_FOLDER_NAME = "plugin"
const CONFIGURATIONS_FOLDER_NAME = "configurations"
const PUBLISHED_BUNDLE_PATH_FROM_BUILD = join("..", "published-review")
const FIXTURE_CASES_PATH_FROM_BUILD = join("..", "..", "..", "tools", "playground-fixtures", "test-cases")

const openDevelopmentContext = async (fixturesPath: string): Promise<Partial<ProcedureContext>> => {
  if (IS_DEVELOPMENT_BUILD) {
    const { createFixtureFileCatalog } = await import("./utils/fixture-file-catalog")
    return { fixtureCatalog: createFixtureFileCatalog(fixturesPath) }
  }
  return {}
}

const start = async (): Promise<void> => {
  const environment = process.env
  const homePath = homedir()
  const serverConfig = readServerConfig(environment)
  const localContext = createLocalProcedureContext(new Date(), {
    dataPath: readDataPath(environment, homePath),
    pluginPath: join(__dirname, PLUGIN_FOLDER_NAME),
    configurationsPath: join(__dirname, CONFIGURATIONS_FOLDER_NAME),
    publishedBundlePath: join(__dirname, PUBLISHED_BUNDLE_PATH_FROM_BUILD),
    mcpUrl: mcpUrlOf(serverConfig),
    serverUrl: serverUrlOf(serverConfig),
    homePath,
    environment,
  })
  const context = { ...localContext, ...(await openDevelopmentContext(join(__dirname, FIXTURE_CASES_PATH_FROM_BUILD))) }
  const server = await buildServer({ logger: true }, context)
  await server.listen(serverConfig)
}

start().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
