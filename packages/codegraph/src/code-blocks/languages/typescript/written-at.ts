import { isFieldOf, isSameNode, textOfName } from "@/ast-graph/languages/typescript/syntax"
import type { SyntaxNode } from "@/ast-graph/parser"
import { chainFrom, selfAndAncestorsOf } from "@/ast-graph/walk-tree"
import type { HandingSlot, WrittenAt } from "@/code-blocks/reading"
import { attributeNameOf, FUNCTION_TYPES } from "./markup"

const OBJECT_TYPE = "object"
const PAIR_TYPE = "pair"
const METHOD_TYPE = "method_definition"
const SHORTHAND_TYPE = "shorthand_property_identifier"
const SPREAD_TYPE = "spread_element"
const ARGUMENTS_TYPE = "arguments"
const EXPRESSION_HOLDER_TYPE = "jsx_expression"
const ATTRIBUTE_TYPE = "jsx_attribute"
const EXTENDING_TYPE = "extends_clause"
const KEYED_TYPES: ReadonlySet<string> = new Set([PAIR_TYPE, METHOD_TYPE])
const NO_KEYS: readonly string[] = []

interface ParentLink {
  readonly child: SyntaxNode
  readonly parent: SyntaxNode | null
}

const parentLinksOf = (node: SyntaxNode): ParentLink[] => {
  const lineage = selfAndAncestorsOf(node)
  return lineage.map((child, index) => ({ child, parent: lineage[index + 1] ?? null }))
}

const keyOf = (property: SyntaxNode): string => {
  const key = property.childForFieldName("key") ?? property.childForFieldName("name")
  return key === null ? "" : textOfName(key)
}

const holdingPairOf = (object: SyntaxNode | null): SyntaxNode | null => {
  const holder = object?.type === OBJECT_TYPE ? object.parent : null
  return holder?.type === PAIR_TYPE && isSameNode(holder.childForFieldName("value"), object) ? holder : null
}

const keysAround = (object: SyntaxNode | null): readonly string[] =>
  [...chainFrom(holdingPairOf(object), (pair) => holdingPairOf(pair.parent))].map(keyOf).reverse()

export const memberPathOf = (node: SyntaxNode): readonly string[] => {
  if (KEYED_TYPES.has(node.type)) return node.parent?.type === OBJECT_TYPE ? [...keysAround(node.parent), keyOf(node)] : NO_KEYS
  const { parent } = node
  return FUNCTION_TYPES.has(node.type) && parent?.type === PAIR_TYPE && isFieldOf(node, "value") ? memberPathOf(parent) : NO_KEYS
}

const isSlotHolder = (holder: SyntaxNode | null): boolean =>
  holder === null || FUNCTION_TYPES.has(holder.type) || holder.type === ARGUMENTS_TYPE || holder.type === EXPRESSION_HOLDER_TYPE

const slotAt = ({ child, parent }: ParentLink): HandingSlot | null => {
  if (parent === null || FUNCTION_TYPES.has(parent.type)) return null
  if (parent.type === ARGUMENTS_TYPE) return parent.namedChildren.findIndex((argument) => isSameNode(argument, child))
  return parent.parent?.type === ATTRIBUTE_TYPE ? attributeNameOf(parent.parent) : null
}

const slotOf = (used: SyntaxNode): HandingSlot | null => {
  const handing = parentLinksOf(used).find(({ parent }) => isSlotHolder(parent))
  return handing === undefined ? null : slotAt(handing)
}

const keysOf = (used: SyntaxNode): Pick<WrittenAt, "keyPath" | "isSpread"> => {
  const { parent } = used
  if (used.type === SHORTHAND_TYPE) return { keyPath: [...keysAround(parent), used.text], isSpread: false }
  if (parent?.type === PAIR_TYPE && isFieldOf(used, "value")) return { keyPath: [...keysAround(parent.parent), keyOf(parent)], isSpread: false }
  if (parent?.type === SPREAD_TYPE && parent.parent?.type === OBJECT_TYPE) return { keyPath: keysAround(parent.parent), isSpread: true }
  return { keyPath: NO_KEYS, isSpread: false }
}

const isBaseOfClass = (used: SyntaxNode): boolean => used.parent?.type === EXTENDING_TYPE && isFieldOf(used, "value")

export const writtenAtOf = (used: SyntaxNode): WrittenAt => ({ slot: slotOf(used), ...keysOf(used), isBase: isBaseOfClass(used) })
