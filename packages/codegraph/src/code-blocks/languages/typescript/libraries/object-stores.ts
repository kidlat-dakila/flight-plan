import type { SyntaxNode } from "@/ast-graph/parser"
import { childrenOf, outermostAt, parentOf } from "@/code-blocks/libraries/read-blocks"
import { partSeedOf, storeSeedOf, type PartSeed, type STORE_HEADINGS, type StoreSeeding } from "@/code-blocks/libraries/store-cards"
import type { CardSeed } from "@/code-blocks/libraries/types"
import type { ReadBlock } from "@/code-blocks/reading"
import { rangeOfNode } from "@/code-blocks/source-range"
import type { CodeBlockType, SourceRange } from "@/code-blocks/types"

export type StorePart = keyof typeof STORE_HEADINGS

export type NodeFinder = (range: SourceRange) => SyntaxNode

export const STORE_HOLDER: PartSeed = { part: "holder", heading: null }

const GETTER_KEYWORD = "get"
const STORE_VALUE: CodeBlockType = "property"
const STORE_FUNCTIONS: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["effect-callback", "function", "method"])
const DECLARED_STORE: CodeBlockType = "state"
const OBJECT_KEYS: ReadonlySet<string> = new Set(["pair", "shorthand_property_identifier"])

const isGetterAt = (nodeAt: NodeFinder, block: ReadBlock): boolean => nodeAt(block.ranges[0]).children.some((child) => child.type === GETTER_KEYWORD)

export const memberPartOf = (member: ReadBlock, nodeAt: NodeFinder): StorePart | undefined => {
  if (member.type === STORE_VALUE) return "state"
  if (!STORE_FUNCTIONS.has(member.type) || member.name === undefined) return undefined
  return isGetterAt(nodeAt, member) ? "getter" : "action"
}

export const memberSeedsOf = (seeding: StoreSeeding, members: readonly ReadBlock[], partOf: (member: ReadBlock) => StorePart | undefined): CardSeed[] =>
  members.flatMap((member) => {
    const part = partOf(member)
    return part === undefined ? [] : [storeSeedOf(seeding, member, partSeedOf(part))]
  })

export const declaredHolderOf = (blocks: readonly ReadBlock[], call: ReadBlock): ReadBlock | null => {
  const holder = parentOf(blocks, call)
  return holder?.type === DECLARED_STORE && holder.parentId === null ? holder : null
}

export const readObjectStore = (seeding: StoreSeeding, call: ReadBlock, blocks: readonly ReadBlock[], nodeAt: NodeFinder): CardSeed[] => {
  const holder = declaredHolderOf(blocks, call)
  const parts = holder === null ? [] : memberSeedsOf(seeding, childrenOf(blocks, call), (member) => memberPartOf(member, nodeAt))
  return holder === null || parts.length === 0 ? [] : [storeSeedOf(seeding, holder, STORE_HOLDER), ...parts]
}

export const firstArgumentOf = (nodeAt: NodeFinder, range: SourceRange): SyntaxNode | null => nodeAt(range).childForFieldName("arguments")?.firstNamedChild ?? null

export const keySeedsOf = (seeding: StoreSeeding, written: SyntaxNode | null, blocks: readonly ReadBlock[]): CardSeed[] =>
  (written?.namedChildren ?? [])
    .filter((key) => OBJECT_KEYS.has(key.type))
    .flatMap((key) => {
      const block = outermostAt(blocks, rangeOfNode(key))
      return block?.type === STORE_VALUE ? [storeSeedOf(seeding, block, partSeedOf("state"))] : []
    })
