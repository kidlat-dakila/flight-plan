import type { PatternMatch } from "@/catalogue/matching/match-sites"
import { blockOfCall, childrenOf, rootOf } from "@/code-blocks/libraries/read-blocks"
import { partSeedOf, storeSeedOf, type STORE_HEADINGS, type StoreSeeding } from "@/code-blocks/libraries/store-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { CodeBlockType } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"

const FIRST_ARGUMENT = 0

const SECOND_ARGUMENT = 1

const PINIA: StoreSeeding = { library: "Pinia", kind: "store" }
const PINIA_DEFINER = "defineStore"
const PINIA_STATE_OPTION = "state"
const PINIA_PART_BY_OPTION: ReadonlyMap<string, keyof typeof STORE_HEADINGS> = new Map([
  ["getters", "getter"],
  ["actions", "action"],
])
const PINIA_PART_BY_SETUP_TYPE: ReadonlyMap<CodeBlockType, keyof typeof STORE_HEADINGS> = new Map<CodeBlockType, keyof typeof STORE_HEADINGS>([
  ["state", "state"],
  ["derived", "getter"],
  ["function", "action"],
])
const PINIA_CALLBACK: CodeBlockType = "effect-callback"
const PINIA_OPTION: CodeBlockType = "property"
const PINIA_FUNCTION: CodeBlockType = "function"

const writtenFunctionOf = (blocks: readonly ReadBlock[], callback: ReadBlock): ReadBlock | undefined =>
  childrenOf(blocks, callback).find((child) => child.type === PINIA_FUNCTION)

const piniaSeedsOf = (members: readonly ReadBlock[], partOf: (member: ReadBlock) => keyof typeof STORE_HEADINGS | undefined): CardSeed[] =>
  members.flatMap((member) => {
    const part = partOf(member)
    return part === undefined || member.name === undefined ? [] : [storeSeedOf(PINIA, member, partSeedOf(part))]
  })

const readOption = (blocks: readonly ReadBlock[], option: ReadBlock): CardSeed[] => {
  if (option.type === PINIA_CALLBACK && option.name === PINIA_STATE_OPTION) {
    const written = writtenFunctionOf(blocks, option)
    return written === undefined ? [] : piniaSeedsOf(childrenOf(blocks, written), (member) => (member.type === PINIA_OPTION ? "state" : undefined))
  }
  if (option.type === PINIA_CALLBACK) {
    const written = writtenFunctionOf(blocks, option)
    return written === undefined ? [] : piniaSeedsOf(childrenOf(blocks, written), (member) => PINIA_PART_BY_SETUP_TYPE.get(member.type))
  }
  const part = option.type === PINIA_OPTION ? PINIA_PART_BY_OPTION.get(option.name ?? "") : undefined
  return part === undefined ? [] : piniaSeedsOf(childrenOf(blocks, option), () => part)
}

const readStore = (blocks: readonly ReadBlock[], match: PatternMatch): CardSeed[] => {
  const definer = match.name === PINIA_DEFINER && match.makes === "state" ? blockOfCall(blocks, match.range) : null
  if (definer === null) return []
  return [storeSeedOf(PINIA, rootOf(blocks, definer), { part: "holder", heading: null }), ...childrenOf(blocks, definer).flatMap((option) => readOption(blocks, option))]
}

const readPiniaCards = ({ matches, blocks }: CardReading): CardSeed[] =>
  firstOfEach(matches.flatMap((match) => readStore(blocks, match)), (seed) => seed.blockId)

export const piniaLibrary: Library = {
  name: "Pinia",
  specifiers: ["pinia"],
  documentedVersion: "4.0",
  category: "state",
  type: "frontend",
  language: "javascript",
  readCards: readPiniaCards,
  patterns: [
    {
      kind: "call",
      name: "defineStore",
      slots: [
        { at: SECOND_ARGUMENT, runs: "in-place" },
        { at: "state", runs: "in-place" },
      ],
      makes: "state",
    },
    {
      kind: "factory",
      name: "defineStore",
      methods: [],
      called: {
        slots: [],
        methods: [
          { kind: "call", name: "$subscribe", slots: [{ at: FIRST_ARGUMENT, runs: "event" }] },
          { kind: "call", name: "$onAction", slots: [{ at: FIRST_ARGUMENT, runs: "event" }] },
        ],
      },
    },
  ],
}
