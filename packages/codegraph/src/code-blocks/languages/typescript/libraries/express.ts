import type { CallPattern, MethodPattern, Slot } from "@/catalogue/types"
import { shortSignatureOf } from "@/code-blocks/languages/typescript/syntax"
import { readRouteCards } from "@/code-blocks/libraries/route-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"

const FIRST_ARGUMENT = 0

const SECOND_ARGUMENT = 1

const LAST_ARGUMENT = "last"

const OTHER_ARGUMENTS = "rest"

const EVERY_METHOD = "*"

const EXPRESS_HANDLER_SLOTS: readonly Slot[] = [
  { at: LAST_ARGUMENT, runs: "route" },
  { at: OTHER_ARGUMENTS, runs: "middleware" },
]

const EXPRESS_ROUTES: readonly CallPattern[] = [
  { kind: "call", name: "get", slots: EXPRESS_HANDLER_SLOTS, pathAt: FIRST_ARGUMENT, method: "GET" },
  { kind: "call", name: "post", slots: EXPRESS_HANDLER_SLOTS, pathAt: FIRST_ARGUMENT, method: "POST" },
  { kind: "call", name: "put", slots: EXPRESS_HANDLER_SLOTS, pathAt: FIRST_ARGUMENT, method: "PUT" },
  { kind: "call", name: "patch", slots: EXPRESS_HANDLER_SLOTS, pathAt: FIRST_ARGUMENT, method: "PATCH" },
  { kind: "call", name: "delete", slots: EXPRESS_HANDLER_SLOTS, pathAt: FIRST_ARGUMENT, method: "DELETE" },
  { kind: "call", name: "head", slots: EXPRESS_HANDLER_SLOTS, pathAt: FIRST_ARGUMENT, method: "HEAD" },
  { kind: "call", name: "options", slots: EXPRESS_HANDLER_SLOTS, pathAt: FIRST_ARGUMENT, method: "OPTIONS" },
  { kind: "call", name: "all", slots: EXPRESS_HANDLER_SLOTS, pathAt: FIRST_ARGUMENT, method: EVERY_METHOD },
]

const EXPRESS_ROUTES_OF_ONE_PATH: readonly CallPattern[] = [
  { kind: "call", name: "get", slots: EXPRESS_HANDLER_SLOTS, method: "GET" },
  { kind: "call", name: "post", slots: EXPRESS_HANDLER_SLOTS, method: "POST" },
  { kind: "call", name: "put", slots: EXPRESS_HANDLER_SLOTS, method: "PUT" },
  { kind: "call", name: "patch", slots: EXPRESS_HANDLER_SLOTS, method: "PATCH" },
  { kind: "call", name: "delete", slots: EXPRESS_HANDLER_SLOTS, method: "DELETE" },
  { kind: "call", name: "head", slots: EXPRESS_HANDLER_SLOTS, method: "HEAD" },
  { kind: "call", name: "options", slots: EXPRESS_HANDLER_SLOTS, method: "OPTIONS" },
  { kind: "call", name: "all", slots: EXPRESS_HANDLER_SLOTS, method: EVERY_METHOD },
]

const EXPRESS_ROUTER_METHODS: readonly MethodPattern[] = [
  ...EXPRESS_ROUTES,
  { kind: "factory", name: "route", prefixAt: FIRST_ARGUMENT, methods: EXPRESS_ROUTES_OF_ONE_PATH },
  { kind: "call", name: "use", slots: [{ at: OTHER_ARGUMENTS, runs: "middleware" }], prefixAt: FIRST_ARGUMENT },
  { kind: "call", name: "param", slots: [{ at: SECOND_ARGUMENT, runs: "middleware" }] },
]

const readExpressCards = (reading: CardReading): CardSeed[] => readRouteCards(reading, shortSignatureOf)

export const expressLibrary: Library = {
  name: "Express",
  specifiers: ["express"],
  documentedVersion: "5.2",
  category: "framework",
  type: "backend",
  language: "javascript",
  readCards: readExpressCards,
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [...EXPRESS_ROUTER_METHODS, { kind: "call", name: "listen", slots: [{ at: LAST_ARGUMENT, runs: "event" }] }],
    },
    { kind: "factory", name: "Router", methods: EXPRESS_ROUTER_METHODS },
  ],
}
