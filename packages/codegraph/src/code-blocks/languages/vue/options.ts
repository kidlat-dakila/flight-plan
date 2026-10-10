import { isSameNode, textOfName } from "@/ast-graph/languages/typescript/syntax"
import { eventNameOf } from "@/ast-graph/languages/vue/markup"
import type { GrammarId, SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching } from "@/ast-graph/query-nodes"
import { chainFrom, roleOf, useOf } from "@/code-blocks/languages/typescript/uses"
import { writtenAtOf } from "@/code-blocks/languages/typescript/written-at"
import type { ReadBlock, ReadUse } from "@/code-blocks/reading"
import { comparePositions, rangeOfNode } from "@/code-blocks/source-range"
import type { SourceRange } from "@/code-blocks/types"

export interface OptionMember {
  readonly name: string
  readonly range: SourceRange
}

const DEFAULT_EXPORT_PATTERN = "(export_statement value: (_) @node)"
const COMPONENT_DEFINERS: ReadonlySet<string> = new Set(["defineComponent", "defineNuxtComponent"])
const HOLDING_OPTIONS: ReadonlySet<string> = new Set(["methods", "computed"])
const DATA_OPTION = "data"
const PROPS_OPTION = "props"
const EMITS_OPTION = "emits"
const EMIT_METHOD = "$emit"
const RECEIVER_TYPE = "this"
const MEMBER_TYPE = "member_expression"
const RECEIVER_PATTERN = "(this) @node"
const LIST_TYPE = "array"
const TEXT_TYPE = "string"
const OWN_RECEIVER_TYPES: ReadonlySet<string> = new Set(["function_expression", "function_declaration", "generator_function", "generator_function_declaration", "method_definition"])
const ONE_OWNER = 1
const CALL_TYPE = "call_expression"
const OBJECT_TYPE = "object"
const PAIR_TYPE = "pair"
const METHOD_TYPE = "method_definition"
const SHORTHAND_TYPE = "shorthand_property_identifier"
const BLOCK_TYPE = "statement_block"
const RETURN_TYPE = "return_statement"
const WRAPPING_TYPE = "parenthesized_expression"
const KEY_TYPE = "property_identifier"

const optionsOf = (exported: SyntaxNode): SyntaxNode | null => {
  if (exported.type === OBJECT_TYPE) return exported
  const isDefined = exported.type === CALL_TYPE && COMPONENT_DEFINERS.has(exported.childForFieldName("function")?.text ?? "")
  const handed = isDefined ? (exported.childForFieldName("arguments")?.firstNamedChild ?? null) : null
  return handed?.type === OBJECT_TYPE ? handed : null
}

const keyOf = (member: SyntaxNode): SyntaxNode | null => {
  if (member.type === SHORTHAND_TYPE) return member
  const key = member.type === PAIR_TYPE ? member.childForFieldName("key") : member.childForFieldName("name")
  return key?.type === KEY_TYPE ? key : null
}

const membersOf = (holder: SyntaxNode | null): OptionMember[] =>
  (holder?.type === OBJECT_TYPE ? holder.namedChildren : []).flatMap((member) => {
    const key = keyOf(member)
    return key === null ? [] : [{ name: key.text, range: rangeOfNode(key) }]
  })

const unwrapped = (value: SyntaxNode | null): SyntaxNode | null => (value?.type === WRAPPING_TYPE ? unwrapped(value.firstNamedChild) : value)

const returnedBy = (callable: SyntaxNode | null): SyntaxNode | null => {
  const body = callable?.childForFieldName("body") ?? null
  if (body?.type !== BLOCK_TYPE) return unwrapped(body)
  return unwrapped(body.namedChildren.find((statement) => statement.type === RETURN_TYPE)?.firstNamedChild ?? null)
}

const valueOf = (member: SyntaxNode): SyntaxNode | null => (member.type === PAIR_TYPE ? member.childForFieldName("value") : null)

const membersOfOption = (option: SyntaxNode): OptionMember[] => {
  const name = keyOf(option)?.text ?? ""
  if (HOLDING_OPTIONS.has(name)) return membersOf(valueOf(option))
  if (name !== DATA_OPTION) return []
  return membersOf(returnedBy(option.type === METHOD_TYPE ? option : valueOf(option)))
}

const listOptionObjects = (grammar: GrammarId, tree: SyntaxTree): SyntaxNode[] =>
  nodesMatching(grammar, tree, DEFAULT_EXPORT_PATTERN).flatMap((exported) => {
    const options = optionsOf(exported)
    return options === null ? [] : [options]
  })

export const listOptionMembers = (grammar: GrammarId, tree: SyntaxTree): OptionMember[] =>
  listOptionObjects(grammar, tree)
    .flatMap((options) => options.namedChildren)
    .flatMap(membersOfOption)

const propsListedIn = (declared: SyntaxNode | null): OptionMember[] => {
  if (declared?.type !== LIST_TYPE) return membersOf(declared)
  return declared.namedChildren.filter((item) => item.type === TEXT_TYPE).map((item) => ({ name: textOfName(item), range: rangeOfNode(item) }))
}

export const listOptionProps = (grammar: GrammarId, tree: SyntaxTree): OptionMember[] =>
  listOptionObjects(grammar, tree)
    .flatMap((options) => options.namedChildren)
    .flatMap((option) => (keyOf(option)?.text === PROPS_OPTION ? propsListedIn(valueOf(option)) : []))

export const listOptionEvents = (grammar: GrammarId, tree: SyntaxTree): OptionMember[] =>
  listOptionObjects(grammar, tree)
    .flatMap((options) => options.namedChildren)
    .flatMap((option) => (keyOf(option)?.text === EMITS_OPTION ? propsListedIn(valueOf(option)) : []))
    .map(({ name, range }) => ({ name: eventNameOf(name), range }))

export const isReceiverEmit = (callee: SyntaxNode): boolean =>
  callee.type === MEMBER_TYPE && callee.childForFieldName("object")?.type === RECEIVER_TYPE && callee.childForFieldName("property")?.text === EMIT_METHOD

const ancestorsWithin = (node: SyntaxNode, holder: SyntaxNode): SyntaxNode[] => {
  const { parent } = node
  return parent === null || isSameNode(parent, holder) ? [] : [parent, ...ancestorsWithin(parent, holder)]
}

const isInside = (node: SyntaxNode, holder: SyntaxNode): boolean => holder.startIndex <= node.startIndex && node.endIndex <= holder.endIndex

const isReceiverOfComponent = (receiver: SyntaxNode, options: readonly SyntaxNode[]): boolean =>
  options.some((holder) => isInside(receiver, holder) && ancestorsWithin(receiver, holder).filter((ancestor) => OWN_RECEIVER_TYPES.has(ancestor.type)).length === ONE_OWNER)

const useOfMember = (receiver: SyntaxNode, members: readonly OptionMember[]): ReadUse[] => {
  const { outermost, path } = chainFrom(receiver)
  const member = path.length === 0 ? undefined : members.find((candidate) => candidate.name === path[0])
  if (member === undefined) return []
  const memberPath = path.slice(1)
  return [
    {
      usedAt: rangeOfNode(outermost),
      use: useOf(roleOf(outermost), memberPath),
      memberPath,
      target: { kind: "local", declarationRange: member.range },
      handing: null,
      writtenAt: writtenAtOf(outermost),
    },
  ]
}

export const listReceiverUses = (grammar: GrammarId, tree: SyntaxTree, members: readonly OptionMember[]): ReadUse[] => {
  const options = listOptionObjects(grammar, tree)
  return nodesMatching(grammar, tree, RECEIVER_PATTERN)
    .filter((receiver) => isReceiverOfComponent(receiver, options))
    .flatMap((receiver) => useOfMember(receiver, members))
}

const startsAt = ({ ranges: [range] }: ReadBlock, { range: { start } }: OptionMember): boolean => comparePositions(range.start, start) === 0

export const withMembersDeclared = (blocks: readonly ReadBlock[], members: readonly OptionMember[]): ReadBlock[] =>
  blocks.map((block) => {
    const member = members.find((candidate) => startsAt(block, candidate))
    return member === undefined ? block : { ...block, declaredAt: [...block.declaredAt, member.range.start] }
  })
