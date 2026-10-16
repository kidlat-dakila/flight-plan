import type { SyntaxNode } from "@/ast-graph/parser"
import type { PatternMatch } from "@/catalogue/matching/match-sites"
import { childrenOf, rootOf, writtenFunctionAt } from "@/code-blocks/libraries/read-blocks"
import { storeSeedOf, type StoreSeeding } from "@/code-blocks/libraries/store-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { CodeBlockType, SourceRange } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"

const RTK_QUERY: StoreSeeding = { library: "RTK Query", kind: "api" }
const RTK_QUERY_API_FACTORY = "createApi"
const RTK_QUERY_ENDPOINTS = "endpoints"
const RTK_QUERY_ENDPOINT: CodeBlockType = "property"
const RTK_QUERY_HEADING_BY_BUILDER: ReadonlyMap<string, string> = new Map([
  ["query", "QUERY"],
  ["infiniteQuery", "QUERY"],
  ["mutation", "MUTATION"],
])

const builderMethodOf = (endpoint: ReadBlock, nodeAt: (range: SourceRange) => SyntaxNode): string | null =>
  nodeAt(endpoint.ranges[0]).childForFieldName("value")?.childForFieldName("function")?.childForFieldName("property")?.text ?? null

const readEndpoints = (match: PatternMatch, { blocks, nodeAt }: CardReading): CardSeed[] =>
  match.slots.flatMap((slot) => {
    const written = writtenFunctionAt(blocks, slot.range)
    if (written === null) return []
    const holder = match.name === RTK_QUERY_API_FACTORY ? [storeSeedOf(RTK_QUERY, rootOf(blocks, written), { part: "holder", heading: null })] : []
    const endpoints = childrenOf(blocks, written).filter((endpoint) => endpoint.type === RTK_QUERY_ENDPOINT).flatMap((endpoint) => {
      const heading = RTK_QUERY_HEADING_BY_BUILDER.get(builderMethodOf(endpoint, nodeAt) ?? "")
      return heading === undefined ? [] : [storeSeedOf(RTK_QUERY, endpoint, { part: "endpoint", heading })]
    })
    return [...holder, ...endpoints]
  })

const readRtkQueryCards = (reading: CardReading): CardSeed[] =>
  firstOfEach(reading.matches.flatMap((match) => readEndpoints(match, reading)), (seed) => seed.blockId)

export const rtkQueryLibrary: Library = {
  name: "RTK Query",
  specifiers: ["@reduxjs/toolkit/query", "@reduxjs/toolkit/query/react"],
  documentedVersion: "2.9",
  category: "data-fetching",
  type: "frontend",
  language: "javascript",
  readCards: readRtkQueryCards,
  patterns: [
    {
      kind: "factory",
      name: "createApi",
      slots: [{ at: RTK_QUERY_ENDPOINTS, runs: "in-place" }],
      makes: "state",
      methods: [
        { kind: "call", name: "injectEndpoints", slots: [{ at: RTK_QUERY_ENDPOINTS, runs: "in-place" }] },
      ],
    },
  ],
}
