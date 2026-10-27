import type { ServerResponse } from "node:http"
import type { Plugin, ViteDevServer } from "vite"
import type { TraceFixtureLoader } from "./trace-fixture-api"
import {
  failureResponseOf,
  isTraceFixtureLoader,
  respondToTraceFixtureRoute,
  traceFixtureRouteOf,
  type JsonResponse,
  type TraceFixtureRoute,
} from "./trace-fixture-requests"

const PLUGIN_NAME = "trace-diagram-lab:trace-fixtures"
const LOADER_MODULE_PATH = "/src/server/trace-fixture-loader.ts"
const LOADER_EXPORT_NAME = "traceFixtureLoader"
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" }
const MISSING_LOADER_MESSAGE = `${LOADER_MODULE_PATH} does not export ${LOADER_EXPORT_NAME}.`

const loadTraceFixtureLoader = async (server: ViteDevServer): Promise<TraceFixtureLoader> => {
  const loaderModule = await server.ssrLoadModule(LOADER_MODULE_PATH)
  const loader: unknown = loaderModule[LOADER_EXPORT_NAME]
  if (!isTraceFixtureLoader(loader)) throw new Error(MISSING_LOADER_MESSAGE)
  return loader
}

const reportFailure = (server: ViteDevServer, error: unknown): void => {
  if (error instanceof Error) server.ssrFixStacktrace(error)
  server.config.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error))
}

const respond = async (server: ViteDevServer, route: TraceFixtureRoute): Promise<JsonResponse> => {
  try {
    return await respondToTraceFixtureRoute(route, await loadTraceFixtureLoader(server))
  } catch (error) {
    reportFailure(server, error)
    return failureResponseOf(error)
  }
}

const writeJson = (response: ServerResponse, { status, body }: JsonResponse): void => {
  response.writeHead(status, JSON_HEADERS).end(JSON.stringify(body))
}

export const traceFixturesPlugin = (): Plugin => ({
  name: PLUGIN_NAME,
  apply: "serve",
  configureServer: (server) => {
    server.middlewares.use((request, response, next) => {
      const route = traceFixtureRouteOf(request.method, request.url)
      if (route === null) {
        next()
        return
      }
      void respond(server, route).then((json) => {
        writeJson(response, json)
      })
    })
  },
})
