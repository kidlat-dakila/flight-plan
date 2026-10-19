import type { MethodPattern, Slot, SlotPosition } from "@/catalogue/types"
import { readRouteCards } from "@/code-blocks/libraries/route-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"

const FIRST_ARGUMENT = 0

const METHODS = "methods[]"

const FASTAPI_PATH: SlotPosition = [FIRST_ARGUMENT, "path"]

const FASTAPI_ENDPOINT: SlotPosition = [1, "endpoint"]

const FASTAPI_PREFIX = "prefix"

const FASTAPI_MIDDLEWARE_CLASS: SlotPosition = [FIRST_ARGUMENT, "middleware_class"]

const DEPENDENCIES: readonly Slot[] = [{ at: "dependencies[]", runs: "middleware" }]

const routeDecorator = (name: string, method: string): MethodPattern => ({ kind: "decorator", name, runs: "route", slots: DEPENDENCIES, pathAt: FASTAPI_PATH, method })

const FASTAPI_ROUTER_METHODS: readonly MethodPattern[] = [
  routeDecorator("get", "GET"),
  routeDecorator("post", "POST"),
  routeDecorator("put", "PUT"),
  routeDecorator("patch", "PATCH"),
  routeDecorator("delete", "DELETE"),
  routeDecorator("options", "OPTIONS"),
  routeDecorator("head", "HEAD"),
  routeDecorator("trace", "TRACE"),
  routeDecorator("websocket", "WEBSOCKET"),
  { kind: "decorator", name: "api_route", runs: "route", slots: DEPENDENCIES, pathAt: FASTAPI_PATH, methodAt: METHODS },
  { kind: "decorator", name: "on_event", runs: "event", eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "add_api_route", slots: [{ at: FASTAPI_ENDPOINT, runs: "route" }, ...DEPENDENCIES], pathAt: FASTAPI_PATH, methodAt: METHODS },
  { kind: "call", name: "include_router", slots: DEPENDENCIES, prefixAt: FASTAPI_PREFIX },
]

const APP_WIDE_MIDDLEWARE: ReadonlySet<string> = new Set(["middleware", "add_middleware"])

const APP_MOUNT = "mount"

const seedIdsOf = (reading: CardReading, isNamed: (name: string) => boolean): ReadonlySet<string> =>
  new Set(readRouteCards({ ...reading, matches: reading.matches.filter((match) => isNamed(match.name)) }).map((seed) => seed.blockId))

const withAppMarks = (seed: CardSeed, appWideIds: ReadonlySet<string>, appMountIds: ReadonlySet<string>): CardSeed => {
  if (appWideIds.has(seed.blockId)) return { ...seed, card: { ...seed.card, isAppWide: true } }
  return appMountIds.has(seed.blockId) ? { ...seed, card: { ...seed.card, isAppMount: true } } : seed
}

const readFastapiCards = (reading: CardReading): CardSeed[] => {
  const appWideIds = seedIdsOf(reading, (name) => APP_WIDE_MIDDLEWARE.has(name))
  const appMountIds = seedIdsOf(reading, (name) => name === APP_MOUNT)
  return readRouteCards(reading).map((seed) => withAppMarks(seed, appWideIds, appMountIds))
}

export const fastapiLibrary: Library = {
  name: "FastAPI",
  specifiers: ["fastapi", "fastapi.templating"],
  documentedVersion: "0.143",
  category: "framework",
  type: "backend",
  language: "python",
  readCards: readFastapiCards,
  patterns: [
    {
      kind: "factory",
      name: "FastAPI",
      slots: DEPENDENCIES,
      methods: [
        ...FASTAPI_ROUTER_METHODS,
        { kind: "decorator", name: "middleware", runs: "middleware" },
        { kind: "call", name: "mount", slots: [], prefixAt: FASTAPI_PATH },
        { kind: "call", name: "add_middleware", slots: [{ at: FASTAPI_MIDDLEWARE_CLASS, runs: "middleware" }] },
        { kind: "decorator", name: "exception_handler", runs: "event", classifies: "error-handling" },
      ],
    },
    { kind: "factory", name: "APIRouter", prefixAt: FASTAPI_PREFIX, slots: DEPENDENCIES, methods: FASTAPI_ROUTER_METHODS },
    { kind: "call", name: "Depends", slots: [{ at: FIRST_ARGUMENT, runs: "in-place" }] },
    { kind: "call", name: "Security", slots: [{ at: FIRST_ARGUMENT, runs: "in-place" }], makes: "auth" },
    { kind: "factory", name: "Jinja2Templates", methods: [{ kind: "call", name: "TemplateResponse", slots: [], classifies: "page" }] },
  ],
}
