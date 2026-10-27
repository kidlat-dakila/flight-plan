import { TRACE_FIXTURES_PATH, type TraceFixtureLoader } from "./trace-fixture-api"

export type TraceFixtureRoute = { readonly kind: "list" } | { readonly kind: "fixture", readonly id: string }

export interface JsonResponse {
  readonly status: number
  readonly body: unknown
}

const GET_METHOD = "GET"
const URL_BASE = "http://localhost"
const OK_STATUS = 200
const NOT_FOUND_STATUS = 404
const SERVER_ERROR_STATUS = 500
const FIXTURE_PATH_PREFIX = `${TRACE_FIXTURES_PATH}/`
const UNKNOWN_FAILURE_MESSAGE = "The trace fixture could not be read."

const decodedOrNull = (text: string): string | null => {
  try {
    return decodeURIComponent(text)
  } catch {
    return null
  }
}

const withoutTrailingSlash = (pathname: string): string => (pathname.endsWith("/") ? pathname.slice(0, -1) : pathname)

export const traceFixtureRouteOf = (method: string | undefined, url: string | undefined): TraceFixtureRoute | null => {
  if (method !== GET_METHOD || url === undefined) return null
  const pathname = withoutTrailingSlash(new URL(url, URL_BASE).pathname)
  if (pathname === TRACE_FIXTURES_PATH) return { kind: "list" }
  if (!pathname.startsWith(FIXTURE_PATH_PREFIX)) return null
  const id = decodedOrNull(pathname.slice(FIXTURE_PATH_PREFIX.length))
  return id === null || id === "" ? null : { kind: "fixture", id }
}

export const okResponseOf = (body: unknown): JsonResponse => ({ status: OK_STATUS, body })

export const notFoundResponseOf = (id: string): JsonResponse => ({ status: NOT_FOUND_STATUS, body: { message: `No trace fixture has the id ${id}.` } })

export const failureResponseOf = (error: unknown): JsonResponse => ({
  status: SERVER_ERROR_STATUS,
  body: { message: error instanceof Error ? error.message : UNKNOWN_FAILURE_MESSAGE },
})

export const respondToTraceFixtureRoute = async (route: TraceFixtureRoute, loader: TraceFixtureLoader): Promise<JsonResponse> => {
  if (route.kind === "list") return okResponseOf(await loader.listTraceFixtures())
  const fixturePage = await loader.readTraceFixturePage(route.id)
  return fixturePage === null ? notFoundResponseOf(route.id) : okResponseOf(fixturePage)
}

const isFunctionAt = (value: object, key: string): boolean => key in value && typeof Reflect.get(value, key) === "function"

export const isTraceFixtureLoader = (value: unknown): value is TraceFixtureLoader =>
  typeof value === "object" && value !== null && isFunctionAt(value, "listTraceFixtures") && isFunctionAt(value, "readTraceFixturePage")
