import { shortSignatureOf } from "@/code-blocks/languages/typescript/syntax"
import { readRouteCards } from "@/code-blocks/libraries/route-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"

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
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "get", slots: [{ at: "last", runs: "route" }], pathAt: 0, method: "GET" },
        { kind: "call", name: "post", slots: [{ at: "last", runs: "route" }], pathAt: 0, method: "POST" },
        { kind: "call", name: "put", slots: [{ at: "last", runs: "route" }], pathAt: 0, method: "PUT" },
        { kind: "call", name: "delete", slots: [{ at: "last", runs: "route" }], pathAt: 0, method: "DELETE" },
        { kind: "call", name: "patch", slots: [{ at: "last", runs: "route" }], pathAt: 0, method: "PATCH" },
        { kind: "call", name: "head", slots: [{ at: "last", runs: "route" }], pathAt: 0, method: "HEAD" },
        { kind: "call", name: "options", slots: [{ at: "last", runs: "route" }], pathAt: 0, method: "OPTIONS" },
        { kind: "call", name: "all", slots: [{ at: "last", runs: "route" }], pathAt: 0, method: "*" },
        { kind: "call", name: "route", slots: [{ at: "handler", runs: "route" }, { at: "preHandler", runs: "middleware" }], pathAt: "url", methodAt: "method" },
        { kind: "call", name: "addHook", slots: [{ at: 1, runs: "middleware" }], eventAt: 0 },
        { kind: "call", name: "register", slots: [{ at: 0, runs: "in-place" }], prefixAt: "prefix" },
        { kind: "call", name: "setErrorHandler", slots: [{ at: 0, runs: "event" }] },
        { kind: "call", name: "listen", slots: [{ at: "last", runs: "event" }] },
      ],
    },
  ],
}
