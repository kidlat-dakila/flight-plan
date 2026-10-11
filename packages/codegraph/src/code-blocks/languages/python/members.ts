import { targetNamesIn } from "@/ast-graph/languages/python/patterns"
import type { SyntaxNode } from "@/ast-graph/parser"

const CLASS_TYPE = "class_definition"
const ASSIGNMENT_TYPE = "assignment"
const STATEMENT_TYPE = "expression_statement"
const MEMBER_TYPE = "attribute"
const NAME_TYPE = "identifier"
const TEXT_TYPE = "string"
const TEXT_CONTENT_TYPE = "string_content"
const INTERPOLATION_TYPE = "interpolation"
const DICTIONARY_TYPE = "dictionary"
const PAIR_TYPE = "pair"
const SUBSCRIPT_TYPE = "subscript"
const CALL_TYPE = "call"
const GETTER_NAME = "get"
const RECEIVER_NAMES: ReadonlySet<string> = new Set(["self", "cls"])
const NO_KEYS: readonly string[] = []

export const textOfKey = (key: SyntaxNode | null): string | null => {
  if (key?.type !== TEXT_TYPE || key.namedChildren.some((part) => part.type === INTERPOLATION_TYPE)) return null
  return key.namedChildren.filter((part) => part.type === TEXT_CONTENT_TYPE).map((part) => part.text).join("")
}

const keysAround = (dictionary: SyntaxNode | null): readonly string[] => {
  const holder = dictionary?.type === DICTIONARY_TYPE ? dictionary.parent : null
  const key = holder?.type === PAIR_TYPE && holder.childForFieldName("value")?.id === dictionary?.id ? textOfKey(holder.childForFieldName("key")) : null
  return holder?.type !== PAIR_TYPE || key === null ? NO_KEYS : [...keysAround(holder.parent), key]
}

export const keyPathOf = (pair: SyntaxNode): readonly string[] => {
  const key = pair.type === PAIR_TYPE && pair.parent?.type === DICTIONARY_TYPE ? textOfKey(pair.childForFieldName("key")) : null
  return key === null ? NO_KEYS : [...keysAround(pair.parent), key]
}

export const keyOfSubscript = (read: SyntaxNode): string | null => {
  const { parent } = read
  const isRead = parent?.type === SUBSCRIPT_TYPE && parent.childForFieldName("value")?.id === read.id
  return isRead ? textOfKey(parent.childForFieldName("subscript")) : null
}

export const keyOfGetter = (read: SyntaxNode): { readonly key: string, readonly call: SyntaxNode } | null => {
  const getter = read.parent
  const call = getter?.parent
  const isGetter = getter?.type === MEMBER_TYPE && getter.childForFieldName("object")?.id === read.id && getter.childForFieldName("attribute")?.text === GETTER_NAME
  if (!isGetter || call?.type !== CALL_TYPE || call.childForFieldName("function")?.id !== getter.id) return null
  const key = textOfKey(call.childForFieldName("arguments")?.firstNamedChild ?? null)
  return key === null ? null : { key, call }
}

const listClassAttributes = (holder: SyntaxNode): SyntaxNode[] =>
  (holder.childForFieldName("body")?.namedChildren ?? []).flatMap((statement) => {
    const assignment = statement.type === STATEMENT_TYPE ? statement.firstNamedChild : null
    const target = assignment?.type === ASSIGNMENT_TYPE ? assignment.childForFieldName("left") : null
    return target?.type === undefined ? [] : targetNamesIn(target)
  })

export const attributeOfReceiver = (assignment: SyntaxNode): SyntaxNode | null => {
  const target = assignment.childForFieldName("left")
  const receiver = target?.type === MEMBER_TYPE ? target.childForFieldName("object") : null
  const isOfReceiver = receiver?.type === NAME_TYPE && RECEIVER_NAMES.has(receiver.text)
  return isOfReceiver ? (target?.childForFieldName("attribute") ?? null) : null
}

const listInstanceAttributes = (holder: SyntaxNode, takenNames: ReadonlySet<string>): SyntaxNode[] => {
  const written = holder
    .descendantsOfType(ASSIGNMENT_TYPE)
    .filter((assignment) => assignment.closest(CLASS_TYPE)?.id === holder.id)
    .flatMap((assignment) => attributeOfReceiver(assignment) ?? [])
    .filter((name) => !takenNames.has(name.text))
  const names = written.map((name) => name.text)
  return written.filter((_name, index) => names.indexOf(names[index]) === index)
}

export const listAttributeNames = (holder: SyntaxNode | null): SyntaxNode[] => {
  if (holder === null) return []
  const ofClass = listClassAttributes(holder)
  return [...ofClass, ...listInstanceAttributes(holder, new Set(ofClass.map((name) => name.text)))]
}
