import type { MatchedSlot } from "@/catalogue/matching/match-sites"
import type { Slot } from "@/catalogue/types"
import { childrenOf, rootOf, writtenFunctionAt } from "@/code-blocks/libraries/read-blocks"
import { partSeedOf, storeSeedOf, type StoreSeeding } from "@/code-blocks/libraries/store-cards"
import type { CardReading, CardSeed, Library } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { CodeBlockType } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"

const ZUSTAND_STORE_SLOTS: readonly Slot[] = [{ at: 0, runs: "in-place", holdsActions: true }]

const ZUSTAND: StoreSeeding = { library: "Zustand", kind: "store" }

const zustandPartOf = (member: ReadBlock): CardSeed[] => {
  if (member.type === "property") return [storeSeedOf(ZUSTAND, member, partSeedOf("state"))]
  return member.type === "function" && member.name !== undefined ? [storeSeedOf(ZUSTAND, member, partSeedOf("action"))] : []
}

const ZUSTAND_HOLDER: CodeBlockType = "state"

const readStoreSlot = (slot: MatchedSlot, blocks: readonly ReadBlock[]): CardSeed[] => {
  const written = writtenFunctionAt(blocks, slot.range)
  const holder = written === null ? null : rootOf(blocks, written)
  const parts = written === null ? [] : childrenOf(blocks, written).flatMap(zustandPartOf)
  return holder?.type === ZUSTAND_HOLDER && parts.length > 0 ? [storeSeedOf(ZUSTAND, holder, { part: "holder", heading: null }), ...parts] : []
}

const readZustandCards = ({ matches, blocks }: CardReading): CardSeed[] =>
  firstOfEach(matches.flatMap((match) => match.slots.filter((slot) => slot.holdsActions).flatMap((slot) => readStoreSlot(slot, blocks))), (seed) => seed.blockId)

export const zustandLibrary: Library = {
  name: "Zustand",
  specifiers: ["zustand", "zustand/vanilla", "zustand/middleware"],
  documentedVersion: "5.0",
  category: "state",
  type: "frontend",
  language: "javascript",
  readCards: readZustandCards,
  patterns: [
    {
      kind: "factory",
      name: "create",
      slots: ZUSTAND_STORE_SLOTS,
      makes: "state",
      methods: [
        { kind: "call", name: "getState", slots: [], makes: "state" },
        { kind: "call", name: "setState", slots: [], makes: "state" },
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
      ],
      called: {
        slots: ZUSTAND_STORE_SLOTS,
        makes: "state",
      },
    },
    {
      kind: "factory",
      name: "createStore",
      slots: ZUSTAND_STORE_SLOTS,
      makes: "state",
      methods: [
        { kind: "call", name: "getState", slots: [], makes: "state" },
        { kind: "call", name: "setState", slots: [], makes: "state" },
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
      ],
    },
    { kind: "call", name: "useStore", slots: [{ at: 1, runs: "in-place" }], makes: "state" },
    { kind: "call", name: "persist", slots: ZUSTAND_STORE_SLOTS, makes: "storage" },
    { kind: "call", name: "devtools", slots: ZUSTAND_STORE_SLOTS },
  ],
}
