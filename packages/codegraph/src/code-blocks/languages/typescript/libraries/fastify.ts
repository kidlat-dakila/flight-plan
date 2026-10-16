import type { CallPattern, MethodPattern, Slot, SlotPosition } from "@/catalogue/types"
import { shortSignatureOf } from "@/code-blocks/languages/typescript/syntax"
import { readRouteCards } from "@/code-blocks/libraries/route-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"

const FIRST_ARGUMENT = 0

const SECOND_ARGUMENT = 1

const LAST_ARGUMENT = "last"

const EVERY_METHOD = "*"

const ROUTE_HOOKS: readonly string[] = ["onRequest", "preParsing", "preValidation", "preHandler"]

const hookPositionsOf = (hold: (hook: string) => string): SlotPosition[] => ROUTE_HOOKS.map((hook) => [`${hold(hook)}[]`, hold(hook)])

const hookSlotsOf = (hold: (hook: string) => string): Slot[] => hookPositionsOf(hold).map((at) => ({ at, runs: "middleware" }))

const SHORTHAND_SLOTS: readonly Slot[] = [{ at: LAST_ARGUMENT, runs: "route" }, ...hookSlotsOf((hook) => `${String(SECOND_ARGUMENT)}.${hook}`)]

const ROUTE_OPTIONS_SLOTS: readonly Slot[] = [{ at: "handler", runs: "route" }, ...hookSlotsOf((hook) => hook)]

const shorthandRoute = (name: string, method: string): CallPattern => ({ kind: "call", name, slots: SHORTHAND_SLOTS, pathAt: FIRST_ARGUMENT, method })

const FASTIFY_INSTANCE_METHODS: readonly MethodPattern[] = [
  shorthandRoute("get", "GET"),
  shorthandRoute("post", "POST"),
  shorthandRoute("put", "PUT"),
  shorthandRoute("delete", "DELETE"),
  shorthandRoute("patch", "PATCH"),
  shorthandRoute("head", "HEAD"),
  shorthandRoute("options", "OPTIONS"),
  shorthandRoute("all", EVERY_METHOD),
  { kind: "call", name: "route", slots: ROUTE_OPTIONS_SLOTS, pathAt: "url", methodAt: ["method[]", "method"] },
  { kind: "call", name: "addHook", slots: [{ at: SECOND_ARGUMENT, runs: "middleware" }], eventAt: FIRST_ARGUMENT },
  { kind: "call", name: "register", slots: [{ at: FIRST_ARGUMENT, runs: "in-place" }], prefixAt: "prefix" },
  { kind: "call", name: "setErrorHandler", slots: [{ at: FIRST_ARGUMENT, runs: "event" }] },
  { kind: "call", name: "listen", slots: [{ at: LAST_ARGUMENT, runs: "event" }] },
]

const readFastifyCards = (reading: CardReading): CardSeed[] => readRouteCards(reading, shortSignatureOf)

export const fastifyLibrary: Library = {
  name: "Fastify",
  specifiers: ["fastify"],
  documentedVersion: "5.12",
  category: "framework",
  type: "backend",
  language: "javascript",
  readCards: readFastifyCards,
  patterns: [
    { kind: "factory", name: "default", makesType: "FastifyInstance", parameterOfTypes: ["FastifyPluginAsync", "FastifyPluginCallback"], methods: FASTIFY_INSTANCE_METHODS },
  ],
}
