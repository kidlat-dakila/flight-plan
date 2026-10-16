import type { SyntaxNode } from "@/ast-graph/parser"
import type { ReadBlock } from "@/code-blocks/reading"
import type { CardKind, CardPart } from "@/code-blocks/types"
import type { CardSeed } from "./types"

export interface StoreSeeding {
  readonly library: string
  readonly kind: CardKind
}

export interface PartSeed {
  readonly part: CardPart
  readonly heading: string | null
  readonly groupKey?: string | null
  readonly name?: string | null
}

export const STORE_HEADINGS = {
  "state": "STATE",
  "getter": "GETTERS",
  "action": "ACTIONS",
  "reducer": "REDUCERS",
  "thunk": "THUNKS",
  "extra-reducer": "EXTRA REDUCERS",
  "listener": "LISTENERS",
  "selector": "SELECTORS",
  "case": "CASES",
} as const

const QUOTED_PATTERN = /^(["'`])(?<text>.*)\1$/s

export const unquotedTextOf = (node: SyntaxNode | null): string | null => {
  if (node === null) return null
  return QUOTED_PATTERN.exec(node.text)?.groups?.text ?? null
}

export const storeSeedOf = ({ library, kind }: StoreSeeding, block: ReadBlock, { part, heading, groupKey = null, name = null }: PartSeed): CardSeed => ({
  blockId: block.id,
  card: { library, kind, part, heading, groupKey, ownerId: null },
  ...(name === null ? {} : { name }),
})

export const partSeedOf = (part: keyof typeof STORE_HEADINGS, name: string | null = null): PartSeed => ({ part, heading: STORE_HEADINGS[part], name })
