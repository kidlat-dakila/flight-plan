import type { PatternMatch } from "@/catalogue/matching/match-sites"
import { blockOfCall, outermostAt, rootOf } from "@/code-blocks/libraries/read-blocks"
import { partSeedOf, storeSeedOf, type StoreSeeding } from "@/code-blocks/libraries/store-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { CodeBlockType } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"
import { firstArgumentOf, keySeedsOf, STORE_HOLDER, type NodeFinder } from "./object-stores"

interface EffectorReading {
  readonly blocks: readonly ReadBlock[]
  readonly nodeAt: NodeFinder
}

const EFFECTOR: StoreSeeding = { library: "Effector", kind: "store" }
const EFFECTOR_STORE_MAKER = "createStore"
const EFFECTOR_CASE_MAKER = "on"
const EFFECTOR_HOLDERS: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["state", "root-variable"])

const readStore = (match: PatternMatch, { blocks, nodeAt }: EffectorReading): CardSeed[] => {
  const call = blockOfCall(blocks, match.range)
  const holder = call === null ? null : rootOf(blocks, call)
  if (holder === null || !EFFECTOR_HOLDERS.has(holder.type)) return []
  return [storeSeedOf(EFFECTOR, holder, STORE_HOLDER), ...keySeedsOf(EFFECTOR, firstArgumentOf(nodeAt, match.range), blocks)]
}

const readCase = (match: PatternMatch, { blocks, nodeAt }: EffectorReading): CardSeed[] => {
  const reducer = match.slots.length === 0 ? null : outermostAt(blocks, match.slots[0].range)
  const trigger = firstArgumentOf(nodeAt, match.range)?.text ?? null
  return reducer === null ? [] : [storeSeedOf(EFFECTOR, reducer, partSeedOf("case", trigger))]
}

const readMatch = (match: PatternMatch, reading: EffectorReading): CardSeed[] => {
  if (match.name === EFFECTOR_STORE_MAKER) return readStore(match, reading)
  return match.name === EFFECTOR_CASE_MAKER ? readCase(match, reading) : []
}

const readEffectorCards = ({ matches, blocks, nodeAt }: CardReading): CardSeed[] =>
  firstOfEach(matches.flatMap((match) => readMatch(match, { blocks, nodeAt })), (seed) => seed.blockId)

export const effectorLibrary: Library = {
  name: "Effector",
  specifiers: ["effector", "effector-react", "effector-vue"],
  documentedVersion: "23.4",
  category: "state",
  type: "frontend",
  language: "javascript",
  readCards: readEffectorCards,
  patterns: [
    {
      kind: "factory",
      name: "createStore",
      makes: "state",
      methods: [
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }] },
      ],
    },
    {
      kind: "factory",
      name: "createEvent",
      methods: [
        { kind: "call", name: "watch", slots: [{ at: 0, runs: "event" }] },
      ],
      called: {
        slots: [],
        makes: "publish",
      },
    },
    { kind: "call", name: "createEffect", slots: [{ at: 0, runs: "kept" }] },
    { kind: "call", name: "sample", slots: [], makes: "publish" },
    { kind: "call", name: "useUnit", slots: [], makes: "state" },
  ],
}
