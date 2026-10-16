import type { MethodPattern, Slot, SlotPosition } from "@/catalogue/types"
import { readRouteCards } from "@/code-blocks/libraries/route-cards"
import type { Library } from "@/code-blocks/libraries/types"

const FIRST_ARGUMENT = 0

const METHODS = "methods[]"

const FASTAPI_PATH: SlotPosition = [FIRST_ARGUMENT, "path"]

const FASTAPI_ENDPOINT: SlotPosition = [1, "endpoint"]

const FASTAPI_PREFIX = "prefix"

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

export const fastapiLibrary: Library = {
  name: "FastAPI",
  specifiers: ["fastapi"],
  documentedVersion: "0.143",
  category: "framework",
  type: "backend",
  language: "python",
  readCards: readRouteCards,
  patterns: [
    {
      kind: "factory",
      name: "FastAPI",
      slots: DEPENDENCIES,
      methods: [
        ...FASTAPI_ROUTER_METHODS,
        { kind: "decorator", name: "middleware", runs: "middleware" },
        { kind: "decorator", name: "exception_handler", runs: "event" },
      ],
    },
    { kind: "factory", name: "APIRouter", prefixAt: FASTAPI_PREFIX, slots: DEPENDENCIES, methods: FASTAPI_ROUTER_METHODS },
    { kind: "call", name: "Depends", slots: [{ at: FIRST_ARGUMENT, runs: "in-place" }] },
    { kind: "call", name: "Security", slots: [{ at: FIRST_ARGUMENT, runs: "in-place" }], makes: "auth" },
  ],
}
