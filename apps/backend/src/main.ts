import { readFile } from "node:fs/promises"
import { homedir, userInfo } from "node:os"
import { join } from "node:path"
import type { FastifyInstance } from "fastify"
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
import { createLocalErrorLog, createLocalProcedureContext, createLocalUpdateChecker, type ProcedureContext } from "./procedures/context"
import { getUpdateNotice } from "./procedures/get-update-notice"
import type { UpdateNotice } from "./procedures/get-update-notice/utils/schemas"
import type { UpdateChecker } from "./procedures/get-update-notice/utils/update-checker"
import { toTerminalLine } from "./procedures/get-update-notice/utils/update-notice"
import { pruneErrorLogs } from "./procedures/prune-error-logs"
import type { ErrorLog } from "./procedures/record-error/utils/error-log"
import { refreshAgentInstalls } from "./procedures/refresh-agent-installs"
import { runMigrations } from "./procedures/run-migrations"
import { buildServer } from "./server"
import { openBrowser } from "./utils/browser-opener"
import { createInitFile } from "./utils/init-file"
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
const START_SOURCE = "Flight Plan start"
const CRASH_SOURCE = "Flight Plan process"
const LOG_CLEANUP_SOURCE = "Log cleanup"
const MIGRATION_SOURCE = "Data migration"
const AGENT_REFRESH_SOURCE = "Agent install"
const UNKNOWN_USER_NAME = ""

type LaunchCommand = Extract<Command, { kind: "launch" }>

const packageManifestSchema = z.object({ version: z.string() })

const openDevelopmentContext = async (fixturesPath: string): Promise<Partial<ProcedureContext>> => {
  if (IS_DEVELOPMENT_BUILD) {
    const { createFixtureFileCatalog } = await import("./utils/fixture-file-catalog")
    return { fixtureCatalog: createFixtureFileCatalog(fixturesPath) }
  }
  return {}
}

const readUserName = (): string => {
  try {
    return userInfo().username
  } catch {
    return UNKNOWN_USER_NAME
  }
}

const openErrorLog = (runningVersion: string | null): ErrorLog =>
  createLocalErrorLog(readDataPath(process.env, homedir()), {
    version: runningVersion,
    platform: process.platform,
    identity: { homePath: homedir(), userName: readUserName() },
  })

const openLocalContext = (serverConfig: ServerConfig, appUrl: string, errorLog: ErrorLog, runningVersion: string | null): ProcedureContext => {
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
    platform: process.platform,
    environment,
    runningVersion,
  }, errorLog)
}

const cleanUpLogs = async (context: ProcedureContext): Promise<void> => {
  await pruneErrorLogs(context).catch(async (failure: unknown) => {
    await context.errorLog.recordFailure(LOG_CLEANUP_SOURCE, failure).saving
  })
}

const migrateData = async (context: ProcedureContext, dataPath: string): Promise<void> => {
  await runMigrations(context, createInitFile(dataPath)).catch(async (failure: unknown) => {
    await context.errorLog.recordFailure(MIGRATION_SOURCE, failure).saving
  })
}

const startDevelopmentServer = async (errorLog: ErrorLog): Promise<void> => {
  const serverConfig = { host: readHost(process.env), port: readRequestedPort(process.env) ?? DEVELOPMENT_PORT }
  const context = {
    ...openLocalContext(serverConfig, DEVELOPMENT_APP_URL, errorLog, null),
    ...(await openDevelopmentContext(join(__dirname, FIXTURE_CASES_PATH_FROM_BUILD))),
  }
  await cleanUpLogs(context)
  await migrateData(context, readDataPath(process.env, homedir()))
  const server = await buildServer({ logger: true }, context)
  watchForCrashes(errorLog, server)
  await server.listen(serverConfig)
}

const showInBrowser = async (url: string, command: LaunchCommand): Promise<void> => {
  if (!command.shouldOpenBrowser) return
  const isOpened = await openBrowser(process.platform, url)
  if (!isOpened) console.log(`Open ${url} in your browser.`)
}

const choosePort = async (host: string, choice: PortChoice, errorLog: ErrorLog): Promise<number | null> => {
  const plan = planPort(choice, await isPortFree(host, preferredPortOf(choice)))
  if (plan.kind === "listen") return plan.port
  if (plan.kind === "find-free-port") return await findFreePort(host)
  console.error(plan.message)
  await errorLog.record({ source: START_SOURCE, message: plan.message, stack: null }).saving
  return null
}

const readPackageVersion = async (): Promise<string> => {
  const manifest: unknown = JSON.parse(await readFile(join(__dirname, PACKAGE_MANIFEST_PATH_FROM_BUILD), "utf8"))
  return packageManifestSchema.parse(manifest).version
}

const readNoVersion = (): null => null

const readRunningVersion = async (): Promise<string | null> =>
  IS_DEVELOPMENT_BUILD ? null : await readPackageVersion().catch(readNoVersion)

const openUpdateChecker = (dataPath: string, runningVersion: string | null): UpdateChecker | undefined =>
  runningVersion === null ? undefined : createLocalUpdateChecker({ dataPath, runningVersion, installPath: __dirname })

const findNoNotice = (): null => null

const checkForUpdate = async (updateChecker: UpdateChecker | undefined): Promise<UpdateNotice | null> =>
  await getUpdateNotice({}, { updateChecker, now: () => new Date() }).catch(findNoNotice)

const printUpdateNotice = async (pendingNotice: Promise<UpdateNotice | null>): Promise<void> => {
  const notice = await pendingNotice
  if (notice !== null) console.log(toTerminalLine(notice))
}

const refreshFailureMessageOf = (agent: string, reason: string): string =>
  `${agent} could not be brought up to date with this Flight Plan. ${reason} Save the agents again in Settings.`

const refreshAgents = async (context: ProcedureContext): Promise<boolean> => {
  const failures = await refreshAgentInstalls(context)
  const messages = failures.map(({ agent, reason }) => refreshFailureMessageOf(agent, reason))
  messages.forEach((message) => {
    console.error(message)
  })
  await Promise.all(messages.map(async (message) => {
    await context.errorLog.record({ source: AGENT_REFRESH_SOURCE, message, stack: null }).saving
  }))
  return failures.length === 0
}

const launch = async (command: LaunchCommand, runningVersion: string | null, errorLog: ErrorLog): Promise<void> => {
  const host = readHost(process.env)
  const dataPath = readDataPath(process.env, homedir())
  const updateChecker = openUpdateChecker(dataPath, runningVersion)
  const pendingNotice = checkForUpdate(updateChecker)
  const savedPortFile = createSavedPortFile(dataPath)
  const savedPort = await savedPortFile.read()
  const choice = { requestedPort: command.port ?? readRequestedPort(process.env), savedPort }
  const runningUrl = serverUrlOf({ host, port: preferredPortOf(choice) })
  if (await isFlightPlanRunning(runningUrl)) {
    console.log(`Flight Plan is already running at ${runningUrl}`)
    await showInBrowser(runningUrl, command)
    await printUpdateNotice(pendingNotice)
    return
  }
  const port = await choosePort(host, choice, errorLog)
  if (port === null) {
    process.exitCode = FAILURE_EXIT_CODE
    return
  }
  const serverConfig = { host, port }
  const serverUrl = serverUrlOf(serverConfig)
  const context = { ...openLocalContext(serverConfig, serverUrl, errorLog, runningVersion), updateChecker }
  await cleanUpLogs(context)
  await migrateData(context, dataPath)
  const server = await buildServer({ logger: { level: PUBLISHED_LOG_LEVEL } }, context, join(__dirname, WEB_PATH_FROM_BUILD))
  watchForCrashes(errorLog, server)
  await server.listen(serverConfig)
  console.log(`Flight Plan is running at ${serverUrl}`)
  const printedNotice = printUpdateNotice(pendingNotice)
  await showInBrowser(serverUrl, command)
  const isRefreshed = await refreshAgents(context)
  if (port !== savedPort && isRefreshed) await savedPortFile.write(port)
  await printedNotice
}

const printVersion = async (): Promise<void> => {
  console.log(await readPackageVersion())
}

const runCommand = async (command: Command, runningVersion: string | null, errorLog: ErrorLog): Promise<void> => {
  if (command.kind === "launch") {
    await launch(command, runningVersion, errorLog)
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

const stopAfterCrash = async (errorLog: ErrorLog, server: FastifyInstance, failure: unknown): Promise<void> => {
  console.error(failure)
  process.exitCode = FAILURE_EXIT_CODE
  await errorLog.recordFailure(CRASH_SOURCE, failure).saving
  await server.close()
}

const watchForCrashes = (errorLog: ErrorLog, server: FastifyInstance): void => {
  const onCrash = (failure: unknown): void => {
    void stopAfterCrash(errorLog, server, failure)
  }
  process.on("uncaughtException", onCrash)
  process.on("unhandledRejection", onCrash)
}

const runFlightPlan = async (runningVersion: string | null, errorLog: ErrorLog): Promise<void> => {
  if (IS_DEVELOPMENT_BUILD) await startDevelopmentServer(errorLog)
  else await runCommand(parseCommand(process.argv.slice(ARGUMENTS_START)), runningVersion, errorLog)
}

const start = async (): Promise<void> => {
  const runningVersion = await readRunningVersion()
  const errorLog = openErrorLog(runningVersion)
  await runFlightPlan(runningVersion, errorLog).catch(async (failure: unknown) => {
    console.error(failure)
    await errorLog.recordFailure(START_SOURCE, failure).saving
    process.exitCode = FAILURE_EXIT_CODE
  })
}

void start()
