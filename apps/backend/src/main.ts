import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { z } from "zod"
import { HELP_TEXT, parseCommand, type Command } from "./command-line"
import {
  DEVELOPMENT_PORT,
  mcpUrlOf,
  planPort,
  preferredPortOf,
  readDataPath,
  readHost,
  readRequestedPort,
  serverUrlOf,
  type PortChoice,
  type ServerConfig,
} from "./config"
import { createLocalProcedureContext, type ProcedureContext } from "./procedures/context"
import { refreshAgentInstalls } from "./procedures/refresh-agent-installs"
import { buildServer } from "./server"
import { openBrowser } from "./utils/browser-opener"
import { findFreePort, isPortFree } from "./utils/port-probe"
import { isFlightPlanRunning } from "./utils/running-instance-probe"
import { createSavedPortFile } from "./utils/saved-port-file"

const PLUGIN_FOLDER_NAME = "plugin"
const CONFIGURATIONS_FOLDER_NAME = "configurations"
const PUBLISHED_BUNDLE_PATH_FROM_BUILD = join("..", "published-review")
const WEB_PATH_FROM_BUILD = join("..", "frontend")
const PACKAGE_MANIFEST_PATH_FROM_BUILD = join("..", "package.json")
const FIXTURE_CASES_PATH_FROM_BUILD = join("..", "..", "..", "tools", "playground-fixtures", "test-cases")
const DEVELOPMENT_APP_URL = "http://localhost:4200"
const PUBLISHED_LOG_LEVEL = "warn"
const ARGUMENTS_START = 2
const FAILURE_EXIT_CODE = 1

type LaunchCommand = Extract<Command, { kind: "launch" }>

const packageManifestSchema = z.object({ version: z.string() })

const openDevelopmentContext = async (fixturesPath: string): Promise<Partial<ProcedureContext>> => {
  if (IS_DEVELOPMENT_BUILD) {
    const { createFixtureFileCatalog } = await import("./utils/fixture-file-catalog")
    return { fixtureCatalog: createFixtureFileCatalog(fixturesPath) }
  }
  return {}
}

const openLocalContext = (serverConfig: ServerConfig, appUrl: string): ProcedureContext => {
  const environment = process.env
  const homePath = homedir()
  return createLocalProcedureContext(new Date(), {
    dataPath: readDataPath(environment, homePath),
    pluginPath: join(__dirname, PLUGIN_FOLDER_NAME),
    configurationsPath: join(__dirname, CONFIGURATIONS_FOLDER_NAME),
    publishedBundlePath: join(__dirname, PUBLISHED_BUNDLE_PATH_FROM_BUILD),
    mcpUrl: mcpUrlOf(serverConfig),
    serverUrl: serverUrlOf(serverConfig),
    appUrl,
    homePath,
    environment,
  })
}

const startDevelopmentServer = async (): Promise<void> => {
  const serverConfig = { host: readHost(process.env), port: readRequestedPort(process.env) ?? DEVELOPMENT_PORT }
  const context = {
    ...openLocalContext(serverConfig, DEVELOPMENT_APP_URL),
    ...(await openDevelopmentContext(join(__dirname, FIXTURE_CASES_PATH_FROM_BUILD))),
  }
  const server = await buildServer({ logger: true }, context)
  await server.listen(serverConfig)
}

const showInBrowser = async (url: string, command: LaunchCommand): Promise<void> => {
  if (!command.shouldOpenBrowser) return
  const isOpened = await openBrowser(process.platform, url)
  if (!isOpened) console.log(`Open ${url} in your browser.`)
}

const choosePort = async (host: string, choice: PortChoice): Promise<number | null> => {
  const plan = planPort(choice, await isPortFree(host, preferredPortOf(choice)))
  if (plan.kind === "listen") return plan.port
  if (plan.kind === "find-free-port") return await findFreePort(host)
  console.error(plan.message)
  return null
}

const refreshAgents = async (context: ProcedureContext): Promise<boolean> => {
  const failures = await refreshAgentInstalls(context)
  failures.forEach(({ agent, reason }) => {
    console.error(`${agent} still points at the previous address. ${reason} Save the agents again in Settings.`)
  })
  return failures.length === 0
}

const launch = async (command: LaunchCommand): Promise<void> => {
  const host = readHost(process.env)
  const savedPortFile = createSavedPortFile(readDataPath(process.env, homedir()))
  const savedPort = await savedPortFile.read()
  const choice = { requestedPort: command.port ?? readRequestedPort(process.env), savedPort }
  const runningUrl = serverUrlOf({ host, port: preferredPortOf(choice) })
  if (await isFlightPlanRunning(runningUrl)) {
    console.log(`Flight Plan is already running at ${runningUrl}`)
    await showInBrowser(runningUrl, command)
    return
  }
  const port = await choosePort(host, choice)
  if (port === null) {
    process.exitCode = FAILURE_EXIT_CODE
    return
  }
  const serverConfig = { host, port }
  const serverUrl = serverUrlOf(serverConfig)
  const context = openLocalContext(serverConfig, serverUrl)
  const server = await buildServer({ logger: { level: PUBLISHED_LOG_LEVEL } }, context, join(__dirname, WEB_PATH_FROM_BUILD))
  await server.listen(serverConfig)
  console.log(`Flight Plan is running at ${serverUrl}`)
  await showInBrowser(serverUrl, command)
  if (port !== savedPort && (await refreshAgents(context))) await savedPortFile.write(port)
}

const printVersion = async (): Promise<void> => {
  const manifest: unknown = JSON.parse(await readFile(join(__dirname, PACKAGE_MANIFEST_PATH_FROM_BUILD), "utf8"))
  console.log(packageManifestSchema.parse(manifest).version)
}

const runCommand = async (command: Command): Promise<void> => {
  if (command.kind === "launch") {
    await launch(command)
    return
  }
  if (command.kind === "version") {
    await printVersion()
    return
  }
  if (command.kind === "help") {
    console.log(HELP_TEXT)
    return
  }
  console.error(`${command.message}\n\n${HELP_TEXT}`)
  process.exitCode = FAILURE_EXIT_CODE
}

const start = async (): Promise<void> => {
  if (IS_DEVELOPMENT_BUILD) await startDevelopmentServer()
  else await runCommand(parseCommand(process.argv.slice(ARGUMENTS_START)))
}

start().catch((error: unknown) => {
  console.error(error)
  process.exitCode = FAILURE_EXIT_CODE
})
