import type { PatternMatch } from "@/catalogue/matching/match-sites"
import type { MethodPattern } from "@/catalogue/types"
import { blockOfCall, rootOf } from "@/code-blocks/libraries/read-blocks"
import { storeSeedOf, type StoreSeeding } from "@/code-blocks/libraries/store-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { CodeBlockType } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"
import { firstArgumentOf, keySeedsOf, STORE_HOLDER, type NodeFinder } from "./object-stores"

const NANOSTORES: StoreSeeding = { library: "Nano Stores", kind: "store" }
const NANOSTORES_MAKERS: ReadonlySet<string> = new Set(["atom", "map"])
const NANOSTORES_HOLDERS: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["state", "root-variable"])
const NANOSTORES_ATOM_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "get", slots: [], makes: "state" },
  { kind: "call", name: "set", slots: [], makes: "state" },
  { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
  { kind: "call", name: "listen", slots: [{ at: 0, runs: "event" }] },
]

const readStore = (match: PatternMatch, blocks: readonly ReadBlock[], nodeAt: NodeFinder): CardSeed[] => {
  const call = NANOSTORES_MAKERS.has(match.name) ? blockOfCall(blocks, match.range) : null
  const holder = call === null ? null : rootOf(blocks, call)
  if (holder === null || !NANOSTORES_HOLDERS.has(holder.type)) return []
  return [storeSeedOf(NANOSTORES, holder, STORE_HOLDER), ...keySeedsOf(NANOSTORES, firstArgumentOf(nodeAt, match.range), blocks)]
}

const readNanostoresCards = ({ matches, blocks, nodeAt }: CardReading): CardSeed[] =>
  firstOfEach(matches.flatMap((match) => readStore(match, blocks, nodeAt)), (seed) => seed.blockId)

export const nanostoresLibrary: Library = {
  name: "Nano Stores",
  specifiers: ["nanostores", "@nanostores/react", "@nanostores/vue"],
  documentedVersion: "1.5",
  category: "state",
  type: "frontend",
  language: "javascript",
  readCards: readNanostoresCards,
  patterns: [
    {
      kind: "factory",
      name: "atom",
      makes: "state",
      methods: NANOSTORES_ATOM_METHODS,
    },
    {
      kind: "factory",
      name: "map",
      makes: "state",
      methods: [
        ...NANOSTORES_ATOM_METHODS,
        { kind: "call", name: "setKey", slots: [], makes: "state" },
      ],
    },
    { kind: "call", name: "computed", slots: [{ at: 1, runs: "in-place" }], makes: "derived" },
    { kind: "call", name: "onMount", slots: [{ at: 1, runs: "effect" }] },
    { kind: "call", name: "useStore", slots: [], makes: "state" },
  ],
}
