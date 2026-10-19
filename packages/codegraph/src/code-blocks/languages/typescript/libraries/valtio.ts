import type { PatternMatch } from "@/catalogue/matching/match-sites"
import { blockOfCall } from "@/code-blocks/libraries/read-blocks"
import type { StoreSeeding } from "@/code-blocks/libraries/store-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import { firstOfEach } from "@/shared/first-of-each"
import { readObjectStore, type NodeFinder } from "./object-stores"

const THIRD_ARGUMENT = 2

const VALTIO: StoreSeeding = { library: "Valtio", kind: "store" }
const VALTIO_STORE_MAKER = "proxy"

const readProxy = (match: PatternMatch, blocks: readonly ReadBlock[], nodeAt: NodeFinder): CardSeed[] => {
  const call = match.name === VALTIO_STORE_MAKER ? blockOfCall(blocks, match.range) : null
  return call === null ? [] : readObjectStore(VALTIO, call, blocks, nodeAt)
}

const readValtioCards = ({ matches, blocks, nodeAt }: CardReading): CardSeed[] =>
  firstOfEach(matches.flatMap((match) => readProxy(match, blocks, nodeAt)), (seed) => seed.blockId)

export const valtioLibrary: Library = {
  name: "Valtio",
  specifiers: ["valtio", "valtio/utils"],
  documentedVersion: "2.3",
  category: "state",
  type: "frontend",
  language: "javascript",
  readCards: readValtioCards,
  patterns: [
    { kind: "call", name: "proxy", slots: [], makes: "state" },
    { kind: "call", name: "useSnapshot", slots: [], makes: "state" },
    { kind: "call", name: "snapshot", slots: [], makes: "state" },
    { kind: "call", name: "subscribe", slots: [{ at: 1, runs: "event" }] },
    { kind: "call", name: "subscribeKey", slots: [{ at: THIRD_ARGUMENT, runs: "event" }] },
  ],
}
