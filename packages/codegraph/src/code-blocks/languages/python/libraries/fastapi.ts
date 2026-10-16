import type { MethodPattern, SlotPosition } from "@/catalogue/types"
import { readRouteCards } from "@/code-blocks/libraries/route-cards"
import type { Library } from "@/code-blocks/libraries/types"

const FIRST_ARGUMENT = 0

const METHODS = "methods"

const FASTAPI_PATH: SlotPosition = [FIRST_ARGUMENT, "path"]

const FASTAPI_ENDPOINT: SlotPosition = [1, "endpoint"]

const FASTAPI_PREFIX = "prefix"

const FASTAPI_ROUTER_METHODS: readonly MethodPattern[] = [
  { kind: "decorator", name: "get", runs: "route", pathAt: FASTAPI_PATH, method: "GET" },
  { kind: "decorator", name: "post", runs: "route", pathAt: FASTAPI_PATH, method: "POST" },
  { kind: "decorator", name: "put", runs: "route", pathAt: FASTAPI_PATH, method: "PUT" },
  { kind: "decorator", name: "patch", runs: "route", pathAt: FASTAPI_PATH, method: "PATCH" },
  { kind: "decorator", name: "delete", runs: "route", pathAt: FASTAPI_PATH, method: "DELETE" },
  { kind: "decorator", name: "options", runs: "route", pathAt: FASTAPI_PATH, method: "OPTIONS" },
  { kind: "decorator", name: "head", runs: "route", pathAt: FASTAPI_PATH, method: "HEAD" },
  { kind: "decorator", name: "trace", runs: "route", pathAt: FASTAPI_PATH, method: "TRACE" },
  { kind: "decorator", name: "api_route", runs: "route", pathAt: FASTAPI_PATH, methodAt: METHODS },
  { kind: "decorator", name: "websocket", runs: "route", pathAt: FASTAPI_PATH, method: "WEBSOCKET" },
  { kind: "decorator", name: "on_event", runs: "event", eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "add_api_route", slots: [{ at: FASTAPI_ENDPOINT, runs: "route" }], pathAt: FASTAPI_PATH, methodAt: METHODS },
  { kind: "call", name: "include_router", slots: [], prefixAt: FASTAPI_PREFIX },
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
      methods: [
        ...FASTAPI_ROUTER_METHODS,
        { kind: "decorator", name: "middleware", runs: "middleware" },
        { kind: "decorator", name: "exception_handler", runs: "event" },
      ],
    },
    { kind: "factory", name: "APIRouter", prefixAt: FASTAPI_PREFIX, methods: FASTAPI_ROUTER_METHODS },
    { kind: "call", name: "Depends", slots: [{ at: FIRST_ARGUMENT, runs: "in-place" }] },
    { kind: "call", name: "Security", slots: [{ at: FIRST_ARGUMENT, runs: "in-place" }], makes: "auth" },
  ],
}
