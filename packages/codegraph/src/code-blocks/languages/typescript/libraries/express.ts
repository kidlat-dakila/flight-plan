import type { SyntaxNode } from "@/ast-graph/parser"
import type { CallPattern, MethodPattern, Slot } from "@/catalogue/types"
import { shortSignatureOf } from "@/code-blocks/languages/typescript/syntax"
import { readRouteCards } from "@/code-blocks/libraries/route-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { LibraryUse, ReadBlock } from "@/code-blocks/reading"
import type { SourceRange } from "@/code-blocks/types"

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

const ERROR_HANDLER_ARITY = 4
const HANDLER_RUNS: ReadonlySet<string> = new Set(["middleware", "route"])
const FUNCTION_TYPES: ReadonlySet<string> = new Set(["arrow_function", "function_expression", "function", "function_declaration", "generator_function_declaration"])
const DECLARED_FUNCTION_TYPES: ReadonlySet<string> = new Set(["function", "component"])

const arityOf = (node: SyntaxNode): number => {
  const parameters = node.childForFieldName("parameters")
  if (parameters !== null) return parameters.namedChildren.filter((parameter) => parameter.type !== "comment").length
  return node.childForFieldName("parameter") === null ? 0 : 1
}

const functionNodeOf = (node: SyntaxNode): SyntaxNode | null => {
  if (FUNCTION_TYPES.has(node.type)) return node
  const value = node.type === "variable_declarator" ? node.childForFieldName("value") : null
  return value !== null && FUNCTION_TYPES.has(value.type) ? value : (node.namedChildren.map(functionNodeOf).find((found) => found !== null) ?? null)
}

const declaredFunctionNamed = (name: string, blocks: readonly ReadBlock[]): ReadBlock | null =>
  blocks.find((block) => block.parentId === null && block.name === name && DECLARED_FUNCTION_TYPES.has(block.type)) ?? null

const handlerRangeOf = (slotRange: SourceRange, { blocks, nodeAt }: CardReading): SourceRange | null => {
  const written = nodeAt(slotRange)
  if (FUNCTION_TYPES.has(written.type)) return slotRange
  const declared = written.type === "identifier" ? declaredFunctionNamed(written.text, blocks) : null
  return declared === null ? null : declared.ranges[0]
}

const isErrorHandlerAt = (range: SourceRange, nodeAt: CardReading["nodeAt"]): boolean => {
  const handler = functionNodeOf(nodeAt(range))
  return handler !== null && arityOf(handler) === ERROR_HANDLER_ARITY
}

const readExpressUses = (reading: CardReading): LibraryUse[] =>
  reading.matches.flatMap((match) =>
    match.slots
      .filter((slot) => HANDLER_RUNS.has(slot.runs))
      .flatMap((slot) => {
        const range = handlerRangeOf(slot.range, reading)
        return range !== null && isErrorHandlerAt(range, reading.nodeAt) ? [{ range, classification: "error-handling" as const }] : []
      }))

export const expressLibrary: Library = {
  name: "Express",
  specifiers: ["express"],
  documentedVersion: "5.2",
  category: "framework",
  type: "backend",
  language: "javascript",
  readCards: readExpressCards,
  readUses: readExpressUses,
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [...EXPRESS_ROUTER_METHODS, { kind: "call", name: "listen", slots: [{ at: LAST_ARGUMENT, runs: "event" }], classifies: "context-and-wiring" }],
    },
    { kind: "factory", name: "Router", methods: EXPRESS_ROUTER_METHODS },
  ],
}
