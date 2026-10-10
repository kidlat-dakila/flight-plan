import { bindingNamesIn } from "@/ast-graph/languages/typescript/patterns"
import { isQuoted, textOfName } from "@/ast-graph/languages/typescript/syntax"
import { eventNameOf } from "@/ast-graph/languages/vue/markup"
import type { GrammarId, SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import { blockIdOf } from "@/code-blocks/languages/typescript/syntax"
import { type ReadBlock, type ReadUse, WRITTEN_NOWHERE } from "@/code-blocks/reading"
import { comparePositions, rangeOfNode } from "@/code-blocks/source-range"
import type { Position, SourceRange } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"
import type { FindHandedPlace } from "./template-uses"

export interface ArgumentKey {
  readonly name: string
  readonly range: SourceRange
  readonly declaredAt: readonly Position[]
}

export interface ComponentArguments {
  readonly keys: readonly ArgumentKey[]
  readonly propsAt: Position | null
  readonly emitAt: Position | null
}

interface Macro {
  readonly call: SyntaxNode
  readonly bound: SyntaxNode | null
}

const PROPS_MACRO = "defineProps"
const EMITS_MACRO = "defineEmits"
const TEMPLATE_EMIT = "$emit"
const CALL_TYPE = "call_expression"
const NAME_TYPE = "identifier"
const DECLARATOR_TYPE = "variable_declarator"
const ARGUMENTS_TYPE = "arguments"
const OBJECT_TYPE = "object"
const LIST_TYPE = "array"
const TYPE_LITERAL_TYPE = "object_type"
const INTERFACE_TYPE = "interface_declaration"
const TYPE_ALIAS_TYPE = "type_alias_declaration"
const SIGNATURE_TYPES: ReadonlySet<string> = new Set(["property_signature", "method_signature"])
const CALL_SIGNATURE_TYPE = "call_signature"
const TEXT_TYPE = "string"
const OBJECT_PATTERN_TYPE = "object_pattern"
const KEYED_BINDING_TYPE = "pair_pattern"
const KEYED_TYPES: ReadonlySet<string> = new Set(["pair", "method_definition", "shorthand_property_identifier"])
const CALL_PATTERN = patternOfTypes([CALL_TYPE])
const TYPE_PATTERN = patternOfTypes([INTERFACE_TYPE, TYPE_ALIAS_TYPE])
const ARGUMENT = "root-argument-value"
const FIRST_PARAMETER = 0
const NOTHING_TAKEN: readonly string[] = []

const calledNameOf = (call: SyntaxNode): string | null => {
  const callee = call.childForFieldName("function")
  return callee?.type === NAME_TYPE ? callee.text : null
}

const firstArgumentOf = (call: SyntaxNode): SyntaxNode | null => call.childForFieldName("arguments")?.firstNamedChild ?? null

const boundOf = (call: SyntaxNode): SyntaxNode | null => {
  const holder = call.parent?.type === ARGUMENTS_TYPE ? call.closest(DECLARATOR_TYPE) : call.parent
  return holder?.type === DECLARATOR_TYPE ? holder.childForFieldName("name") : null
}

const findMacro = (grammar: GrammarId, tree: SyntaxTree, name: string): Macro | null => {
  const call = nodesMatching(grammar, tree, CALL_PATTERN).find((candidate) => calledNameOf(candidate) === name) ?? null
  return call === null ? null : { call, bound: boundOf(call) }
}

const membersOfType = (type: SyntaxNode | null, grammar: GrammarId, tree: SyntaxTree): SyntaxNode[] => {
  if (type === null) return []
  if (type.type === TYPE_LITERAL_TYPE) return type.namedChildren
  const declared = nodesMatching(grammar, tree, TYPE_PATTERN).find((candidate) => candidate.childForFieldName("name")?.text === type.text)
  const body = declared?.childForFieldName("body") ?? declared?.childForFieldName("value") ?? null
  return body === null || body.id === type.id ? [] : body.namedChildren
}

const typeArgumentOf = (call: SyntaxNode): SyntaxNode | null => call.childForFieldName("type_arguments")?.firstNamedChild ?? null

const keyNodesOfValue = (value: SyntaxNode | null): SyntaxNode[] => {
  if (value?.type === LIST_TYPE) return value.namedChildren.filter((item) => item.type === TEXT_TYPE)
  if (value?.type !== OBJECT_TYPE) return []
  return value.namedChildren.filter((property) => KEYED_TYPES.has(property.type)).map((property) => property.childForFieldName("key") ?? property.childForFieldName("name") ?? property)
}

const eventOfSignature = (signature: SyntaxNode): SyntaxNode[] => signature.descendantsOfType(TEXT_TYPE).slice(0, 1)

const keyNodesOfType = (members: readonly SyntaxNode[]): SyntaxNode[] =>
  members.flatMap((member) => {
    if (member.type === CALL_SIGNATURE_TYPE) return eventOfSignature(member)
    const name = SIGNATURE_TYPES.has(member.type) ? member.childForFieldName("name") : null
    return name === null ? [] : [name]
  })

const textOf = (key: SyntaxNode): string => (isQuoted(key) ? textOfName(key) : key.text)

const listKeyNodes = ({ call }: Macro, grammar: GrammarId, tree: SyntaxTree): SyntaxNode[] => [
  ...keyNodesOfType(membersOfType(typeArgumentOf(call), grammar, tree)),
  ...keyNodesOfValue(firstArgumentOf(call)),
]

const bindingsTakenApart = (bound: SyntaxNode | null): ReadonlyMap<string, SyntaxNode> => {
  if (bound?.type !== OBJECT_PATTERN_TYPE) return new Map()
  return new Map(
    bound.namedChildren.flatMap((property) =>
      bindingNamesIn(property)
        .slice(0, 1)
        .map((binding) => [property.type === KEYED_BINDING_TYPE ? (property.childForFieldName("key")?.text ?? binding.text) : binding.text, binding] as const)),
  )
}

const startOf = (node: SyntaxNode): Position => rangeOfNode(node).start

const propKeysOf = (macro: Macro, grammar: GrammarId, tree: SyntaxTree): ArgumentKey[] => {
  const takenApart = bindingsTakenApart(macro.bound)
  const declared = listKeyNodes(macro, grammar, tree).map((key): ArgumentKey => {
    const binding = takenApart.get(textOf(key))
    return { name: textOf(key), range: rangeOfNode(key), declaredAt: [startOf(key), ...(binding === undefined ? [] : [startOf(binding)])] }
  })
  const declaredNames = new Set(declared.map((key) => key.name))
  const onlyTakenApart = [...takenApart].filter(([name]) => !declaredNames.has(name)).map(([name, binding]): ArgumentKey => ({ name, range: rangeOfNode(binding), declaredAt: [startOf(binding)] }))
  return [...declared, ...onlyTakenApart]
}

const eventKeysOf = (macro: Macro, grammar: GrammarId, tree: SyntaxTree): ArgumentKey[] =>
  listKeyNodes(macro, grammar, tree).map((key) => ({ name: eventNameOf(textOf(key)), range: rangeOfNode(key), declaredAt: [startOf(key)] }))

const nameBoundBy = (macro: Macro | null): Position | null => (macro?.bound?.type === NAME_TYPE ? startOf(macro.bound) : null)

export const readComponentArguments = (grammar: GrammarId, tree: SyntaxTree): ComponentArguments => {
  const props = findMacro(grammar, tree, PROPS_MACRO)
  const emits = findMacro(grammar, tree, EMITS_MACRO)
  return {
    keys: [...(props === null ? [] : propKeysOf(props, grammar, tree)), ...(emits === null ? [] : eventKeysOf(emits, grammar, tree))],
    propsAt: nameBoundBy(props),
    emitAt: nameBoundBy(emits),
  }
}

const isAt = (range: SourceRange, position: Position | null): boolean => position !== null && comparePositions(range.start, position) === 0

const isReadOf = ({ target }: ReadUse, declaredAt: Position | null): boolean => target.kind === "local" && isAt(target.declarationRange, declaredAt)

const keysReadThrough = (uses: readonly ReadUse[], { keys, propsAt }: ComponentArguments): ArgumentKey[] => {
  const known = new Set(keys.map((key) => key.name))
  const read = uses.filter((use) => isReadOf(use, propsAt) && use.memberPath.length > 0 && !known.has(use.memberPath[0]))
  return firstOfEach(read, (use) => use.memberPath[0]).map((use) => ({ name: use.memberPath[0], range: use.usedAt, declaredAt: [use.usedAt.start] }))
}

export const withKeysRead = (taken: ComponentArguments, uses: readonly ReadUse[]): ComponentArguments => ({
  ...taken,
  keys: [...taken.keys, ...keysReadThrough(uses, taken)],
})

export const argumentBlocksOf = ({ keys }: ComponentArguments, filePath: string, componentId: string): ReadBlock[] =>
  firstOfEach(keys, (key) => key.name).map(({ name, range, declaredAt }) => ({
    id: blockIdOf(filePath, ARGUMENT, range, NOTHING_TAKEN),
    name,
    type: ARGUMENT,
    ranges: [range],
    parentId: componentId,
    declaredAt,
    argument: { parameterIndex: FIRST_PARAMETER, role: "key" },
  }))

const findKey = ({ keys }: ComponentArguments, name: string): ArgumentKey | null => keys.find((key) => key.name === name) ?? null

const throughKey = (use: ReadUse, taken: ComponentArguments): ReadUse => {
  const key = isReadOf(use, taken.propsAt) && use.memberPath.length > 0 ? findKey(taken, use.memberPath[0]) : null
  if (key === null) return use
  const memberPath = use.memberPath.slice(1)
  return { ...use, target: { kind: "local", declarationRange: key.range }, memberPath, use: use.use === "read" && memberPath.length === 0 ? "value" : use.use }
}

export interface EmittingTree {
  readonly grammar: GrammarId
  readonly tree: SyntaxTree
  readonly isEmit: (callee: SyntaxNode) => boolean
  readonly findHandedPlace: FindHandedPlace
}

const emittedUseOf = (call: SyntaxNode, taken: ComponentArguments, findHandedPlace: FindHandedPlace): ReadUse[] => {
  const callee = call.childForFieldName("function")
  const event = firstArgumentOf(call)
  const key = event?.type === TEXT_TYPE ? findKey(taken, eventNameOf(textOfName(event))) : null
  if (callee === null || key === null) return []
  const emitted = { usedAt: rangeOfNode(callee), memberPath: [], target: { kind: "local", declarationRange: key.range } } as const
  const handed = findHandedPlace(rangeOfNode(call))
  const handing = handed?.handing ?? null
  if (handed === null || handing === null) return [{ ...emitted, use: "call", handing: null, writtenAt: WRITTEN_NOWHERE }]
  return [{ ...emitted, use: "value", handing, writtenAt: handed.writtenAt }]
}

export const isTemplateEmit = (callee: SyntaxNode): boolean => callee.type === NAME_TYPE && callee.text === TEMPLATE_EMIT

export const listEmittedUses = ({ grammar, tree, isEmit, findHandedPlace }: EmittingTree, taken: ComponentArguments): ReadUse[] =>
  nodesMatching(grammar, tree, CALL_PATTERN)
    .filter((call) => {
      const callee = call.childForFieldName("function")
      return callee !== null && isEmit(callee)
    })
    .flatMap((call) => emittedUseOf(call, taken, findHandedPlace))

export const listEmittedEvents = ({ grammar, tree, isEmit }: Pick<EmittingTree, "grammar" | "tree" | "isEmit">): ArgumentKey[] =>
  nodesMatching(grammar, tree, CALL_PATTERN).flatMap((call) => {
    const callee = call.childForFieldName("function")
    const event = firstArgumentOf(call)
    if (callee === null || !isEmit(callee) || event?.type !== TEXT_TYPE) return []
    return [{ name: eventNameOf(textOfName(event)), range: rangeOfNode(event), declaredAt: [startOf(event)] }]
  })

export const throughArguments = (uses: readonly ReadUse[], taken: ComponentArguments): ReadUse[] => uses.map((use) => throughKey(use, taken))
