import type { PatternMatch } from "@/catalogue/matching/match-sites"
import { blockOfCall, childrenOf, rootOf } from "@/code-blocks/libraries/read-blocks"
import { storeSeedOf, type StoreSeeding } from "@/code-blocks/libraries/store-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { CodeBlockType } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"
import { memberSeedsOf, STORE_HOLDER, type StorePart } from "./object-stores"

const XSTATE: StoreSeeding = { library: "XState", kind: "store" }
const XSTATE_STORE_MAKER = "createStore"
const XSTATE_HOLDER: CodeBlockType = "state"
const XSTATE_PART_BY_OPTION: ReadonlyMap<string, StorePart> = new Map<string, StorePart>([
  ["context", "state"],
  ["on", "action"],
])

const readOption = (option: ReadBlock, blocks: readonly ReadBlock[]): CardSeed[] => {
  const part = XSTATE_PART_BY_OPTION.get(option.name ?? "")
  return part === undefined ? [] : memberSeedsOf(XSTATE, childrenOf(blocks, option), (member) => (member.name === undefined ? undefined : part))
}

const readStore = (match: PatternMatch, blocks: readonly ReadBlock[]): CardSeed[] => {
  const call = match.name === XSTATE_STORE_MAKER ? blockOfCall(blocks, match.range) : null
  const holder = call === null ? null : rootOf(blocks, call)
  if (call === null || holder?.type !== XSTATE_HOLDER) return []
  return [storeSeedOf(XSTATE, holder, STORE_HOLDER), ...childrenOf(blocks, call).flatMap((option) => readOption(option, blocks))]
}

const readXstateCards = ({ matches, blocks }: CardReading): CardSeed[] =>
  firstOfEach(matches.flatMap((match) => readStore(match, blocks)), (seed) => seed.blockId)

export const xstateLibrary: Library = {
  name: "XState",
  specifiers: ["xstate", "@xstate/react", "@xstate/vue", "@xstate/store"],
  documentedVersion: "5.33",
  category: "state",
  type: "frontend",
  language: "javascript",
  readCards: readXstateCards,
  patterns: [
    { kind: "call", name: "createMachine", slots: [], makes: "state" },
    {
      kind: "factory",
      name: "createActor",
      makes: "state",
      methods: [
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
        { kind: "call", name: "send", slots: [], makes: "publish" },
      ],
    },
    {
      kind: "factory",
      name: "createStore",
      makes: "state",
      methods: [
        { kind: "call", name: "getSnapshot", slots: [], makes: "state" },
        { kind: "call", name: "send", slots: [], makes: "publish" },
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }] },
      ],
    },
    { kind: "call", name: "fromPromise", slots: [{ at: 0, runs: "kept" }] },
    { kind: "call", name: "assign", slots: [], makes: "state" },
    { kind: "call", name: "useMachine", slots: [], makes: "state" },
    { kind: "call", name: "useSelector", slots: [{ at: 1, runs: "in-place" }], makes: "state" },
  ],
}
