import { PLAYGROUNDS_PATH, TRACE_FIXTURES_PATH, type TraceFixtureLoader } from "./trace-fixture-api"

export type TraceFixtureRoute
  = | { readonly kind: "list" }
    | { readonly kind: "fixture", readonly id: string }
    | { readonly kind: "playgrounds" }
    | { readonly kind: "playground", readonly id: string }

export interface JsonResponse {
  readonly status: number
  readonly body: unknown
}

interface RoutedCollection {
  readonly path: string
  readonly listRoute: TraceFixtureRoute
  readonly itemRouteOf: (id: string) => TraceFixtureRoute
}

const GET_METHOD = "GET"
const URL_BASE = "http://localhost"
const OK_STATUS = 200
const NOT_FOUND_STATUS = 404
const SERVER_ERROR_STATUS = 500
const UNKNOWN_FAILURE_MESSAGE = "The trace fixture could not be read."
const TRACE_FIXTURE_SUBJECT = "trace fixture"
const PLAYGROUND_SUBJECT = "playground"

const ROUTED_COLLECTIONS: readonly RoutedCollection[] = [
  { path: TRACE_FIXTURES_PATH, listRoute: { kind: "list" }, itemRouteOf: (id) => ({ kind: "fixture", id }) },
  { path: PLAYGROUNDS_PATH, listRoute: { kind: "playgrounds" }, itemRouteOf: (id) => ({ kind: "playground", id }) },
]

const decodedOrNull = (text: string): string | null => {
  try {
    return decodeURIComponent(text)
  } catch {
    return null
  }
}

const withoutTrailingSlash = (pathname: string): string => (pathname.endsWith("/") ? pathname.slice(0, -1) : pathname)

const collectionRouteOf = (pathname: string, { path, listRoute, itemRouteOf }: RoutedCollection): TraceFixtureRoute | null => {
  if (pathname === path) return listRoute
  const itemPathPrefix = `${path}/`
  if (!pathname.startsWith(itemPathPrefix)) return null
  const id = decodedOrNull(pathname.slice(itemPathPrefix.length))
  return id === null || id === "" ? null : itemRouteOf(id)
}

export const traceFixtureRouteOf = (method: string | undefined, url: string | undefined): TraceFixtureRoute | null => {
  if (method !== GET_METHOD || url === undefined) return null
  const pathname = withoutTrailingSlash(new URL(url, URL_BASE).pathname)
  return ROUTED_COLLECTIONS.reduce<TraceFixtureRoute | null>((route, collection) => route ?? collectionRouteOf(pathname, collection), null)
}

export const okResponseOf = (body: unknown): JsonResponse => ({ status: OK_STATUS, body })

export const notFoundResponseOf = (subject: string, id: string): JsonResponse => ({ status: NOT_FOUND_STATUS, body: { message: `No ${subject} has the id ${id}.` } })

export const failureResponseOf = (error: unknown): JsonResponse => ({
  status: SERVER_ERROR_STATUS,
  body: { message: error instanceof Error ? error.message : UNKNOWN_FAILURE_MESSAGE },
})

const foundResponseOf = (subject: string, id: string, found: unknown): JsonResponse =>
  found === null ? notFoundResponseOf(subject, id) : okResponseOf(found)

export const respondToTraceFixtureRoute = async (route: TraceFixtureRoute, loader: TraceFixtureLoader): Promise<JsonResponse> => {
  switch (route.kind) {
    case "list":
      return okResponseOf(await loader.listTraceFixtures())
    case "fixture":
      return foundResponseOf(TRACE_FIXTURE_SUBJECT, route.id, await loader.readTraceFixturePage(route.id))
    case "playgrounds":
      return okResponseOf(await loader.listPlaygrounds())
    case "playground":
      return foundResponseOf(PLAYGROUND_SUBJECT, route.id, await loader.readPlaygroundPage(route.id))
  }
}

const LOADER_FUNCTION_NAMES = ["listTraceFixtures", "readTraceFixturePage", "listPlaygrounds", "readPlaygroundPage"]

const isFunctionAt = (value: object, key: string): boolean => key in value && typeof Reflect.get(value, key) === "function"

export const isTraceFixtureLoader = (value: unknown): value is TraceFixtureLoader =>
  typeof value === "object" && value !== null && LOADER_FUNCTION_NAMES.every((name) => isFunctionAt(value, name))
