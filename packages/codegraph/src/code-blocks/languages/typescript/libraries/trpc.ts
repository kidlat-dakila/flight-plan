import { innermostAt, rootOf } from "@/code-blocks/libraries/read-blocks"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { BlockCard, CardPart } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"

const TRPC = "tRPC"
const TRPC_HEADING_BY_PROCEDURE: ReadonlyMap<string, string> = new Map([
  ["query", "QUERY"],
  ["mutation", "MUTATION"],
  ["subscription", "SUBSCRIPTION"],
])
const TRPC_MIDDLEWARE = "use"

const trpcCardOf = (part: CardPart, heading: string | null): BlockCard => ({ library: TRPC, kind: "router", part, heading, groupKey: null, ownerId: null })

const trpcSeedOf = (block: ReadBlock, part: CardPart, heading: string | null): CardSeed => ({ blockId: block.id, card: trpcCardOf(part, heading) })

const readTrpcCards = ({ matches, blocks }: CardReading): CardSeed[] => {
  const procedures = matches.flatMap((match) => {
    const heading = match.isOwnNode ? (TRPC_HEADING_BY_PROCEDURE.get(match.name) ?? null) : null
    const block = heading === null ? null : innermostAt(blocks, match.range)
    return block === null || heading === null ? [] : [{ block, heading }]
  })
  const routers = firstOfEach(procedures.map(({ block }) => rootOf(blocks, block)), (block) => block.id)
  const routerIds = new Set(routers.map((router) => router.id))
  const builtOn = firstOfEach(
    matches.flatMap((match) => {
      const used = match.name === TRPC_MIDDLEWARE ? innermostAt(blocks, match.range) : null
      const root = used === null ? null : rootOf(blocks, used)
      return root === null || routerIds.has(root.id) ? [] : [root]
    }),
    (block) => block.id,
  )
  return [
    ...procedures.map(({ block, heading }) => trpcSeedOf(block, "procedure", heading)),
    ...routers.map((router) => trpcSeedOf(router, "holder", null)),
    ...builtOn.map((base) => trpcSeedOf(base, "middleware", null)),
  ]
}

export const trpcLibrary: Library = {
  name: "tRPC",
  specifiers: ["@trpc/server", "@trpc/client", "@trpc/react-query"],
  documentedVersion: "11.19",
  category: "framework",
  type: "fullstack",
  language: "javascript",
  readCards: readTrpcCards,
  patterns: [
    {
      kind: "factory",
      name: "initTRPC.create",
      methods: [
        { kind: "call", name: "query", slots: [{ at: 0, runs: "resolver" }], isOwnNode: true },
        { kind: "call", name: "mutation", slots: [{ at: 0, runs: "resolver" }], isOwnNode: true },
        { kind: "call", name: "subscription", slots: [{ at: 0, runs: "resolver" }], isOwnNode: true },
        { kind: "call", name: "use", slots: [{ at: 0, runs: "middleware" }] },
        { kind: "call", name: "input", slots: [], makes: "validation" },
      ],
    },
    {
      kind: "factory",
      name: "createTRPCClient",
      methods: [
        { kind: "call", name: "query", slots: [], makes: "data-fetch" },
        { kind: "call", name: "mutate", slots: [], makes: "request" },
      ],
    },
    {
      kind: "factory",
      name: "createTRPCReact",
      methods: [
        { kind: "call", name: "useQuery", slots: [], makes: "data-fetch" },
        { kind: "call", name: "useSuspenseQuery", slots: [], makes: "data-fetch" },
        { kind: "call", name: "useInfiniteQuery", slots: [], makes: "data-fetch" },
        { kind: "call", name: "useSuspenseInfiniteQuery", slots: [], makes: "data-fetch" },
        { kind: "call", name: "useMutation", slots: [], makes: "request" },
      ],
    },
  ],
}
