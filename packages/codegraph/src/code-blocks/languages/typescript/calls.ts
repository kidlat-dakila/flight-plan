import { isSameNode, textOfName } from "@/ast-graph/languages/typescript/syntax"
import type { SyntaxNode } from "@/ast-graph/parser"
import type { CodeBlockCatalogue, CodeBlockType } from "@/code-blocks/types"
import { COLLECTION_METHODS, FUNCTION_TYPES, isEventName, listArguments, methodNameOf } from "./markup"
import type { FileNaming } from "./named-by"

export interface CallbackSlot {
  readonly node: SyntaxNode
  readonly name: string
}

export interface CallReader {
  readonly isGlobal: (name: SyntaxNode) => boolean
  readonly leadsToFunction: (name: SyntaxNode) => boolean
  readonly naming: FileNaming
}

export type EffectPlace = "component" | "elsewhere"

const PROMISE_METHODS: ReadonlySet<string> = new Set(["then", "catch", "finally"])
const LISTENING_METHODS: ReadonlySet<string> = new Set(["addEventListener", "on", "once", "addListener", "subscribe"])
const CALL_TYPE = "call_expression"
const CONSTRUCTION_TYPE = "new_expression"
const MEMBER_TYPE = "member_expression"
const NAME_TYPE = "identifier"
const META_TYPE = "meta_property"
const OPTIONS_TYPE = "object"
const PAIR_TYPE = "pair"
const METHOD_TYPE = "method_definition"
const SHORTHAND_TYPE = "shorthand_property_identifier"
const ARGUMENTS_TYPE = "arguments"
const REQUEST_GLOBAL = "fetch"
const REQUEST_OPTIONS_INDEX = 1
const METHOD_OPTION = "method"
const READING_METHOD = "GET"
const TEXT_TYPE = "string"
const SPREAD_TYPE = "spread_element"
const ENVIRONMENT_MEMBER = "env"
const PROCESS_GLOBAL = "process"
const MODULE_META = "import.meta"
const DOCUMENT_GLOBAL = "document"
const COOKIE_MEMBER = "cookie"
const CALLED_GLOBALS: ReadonlyMap<string, CodeBlockType> = new Map<string, CodeBlockType>([
  ["console", "telemetry"],
  ["localStorage", "storage"],
  ["sessionStorage", "storage"],
  ["indexedDB", "storage"],
])
const CONSTRUCTED_GLOBALS: ReadonlyMap<string, CodeBlockType> = new Map<string, CodeBlockType>([["EventSource", "data-fetch"]])
const ENVIRONMENT_DEPTH = 1
const VARIABLE_DEPTH = 2
const GLOBAL_MEMBER_DEPTH = 1
const STORAGE_GLOBALS: ReadonlySet<string> = new Set(["localStorage", "sessionStorage", "indexedDB"])

const rootOf = (member: SyntaxNode): SyntaxNode => {
  const object = member.type === MEMBER_TYPE ? member.childForFieldName("object") : null
  return object === null ? member : rootOf(object)
}

const memberPathOf = (member: SyntaxNode): string[] => {
  const object = member.type === MEMBER_TYPE ? member.childForFieldName("object") : null
  if (object === null) return []
  return [...memberPathOf(object), member.childForFieldName("property")?.text ?? ""]
}

const isCallbackValue = (value: SyntaxNode, reader: CallReader): boolean =>
  FUNCTION_TYPES.has(value.type) || (value.type === NAME_TYPE && (reader.leadsToFunction(value) || reader.naming.slotAt(value) !== null))

const slotOfOption = (option: SyntaxNode, reader: CallReader): CallbackSlot[] => {
  if (option.type === METHOD_TYPE) return [{ node: option, name: option.childForFieldName("name")?.text ?? "" }]
  if (option.type === SHORTHAND_TYPE) return isEventName(option.text) || reader.leadsToFunction(option) ? [{ node: option, name: option.text }] : []
  const key = option.childForFieldName("key")
  const value = option.childForFieldName("value")
  if (option.type !== PAIR_TYPE || key === null || value === null) return []
  return isEventName(key.text) || isCallbackValue(value, reader) ? [{ node: option, name: key.text }] : []
}

const slotsOfArgument = (argument: SyntaxNode, index: number, reader: CallReader): CallbackSlot[] => {
  if (argument.type === OPTIONS_TYPE) return argument.namedChildren.flatMap((option) => slotOfOption(option, reader))
  return isCallbackValue(argument, reader) ? [{ node: argument, name: String(index) }] : []
}

export const listCallbackSlots = (call: SyntaxNode, reader: CallReader): CallbackSlot[] =>
  listArguments(call).flatMap((argument, index) => slotsOfArgument(argument, index, reader))

const isLanguageMethod = (call: SyntaxNode): boolean => {
  const method = methodNameOf(call)
  return method !== null && (COLLECTION_METHODS.has(method) || PROMISE_METHODS.has(method))
}

const isMethodOption = (option: SyntaxNode): boolean => {
  if (option.type === SHORTHAND_TYPE) return option.text === METHOD_OPTION
  const key = option.type === PAIR_TYPE ? option.childForFieldName("key") : null
  return key !== null && textOfName(key) === METHOD_OPTION
}

const namesReadingMethod = (option: SyntaxNode): boolean => {
  const method = option.childForFieldName("value")
  return method?.type === TEXT_TYPE && textOfName(method).toUpperCase() === READING_METHOD
}

const requestOptionsOf = (call: SyntaxNode): SyntaxNode | null => {
  const passed = listArguments(call)
  return passed.length > REQUEST_OPTIONS_INDEX ? passed[REQUEST_OPTIONS_INDEX] : null
}

const isReadingRequest = (call: SyntaxNode): boolean => {
  const options = requestOptionsOf(call)
  if (options === null) return true
  if (options.type !== OPTIONS_TYPE) return false
  const method = options.namedChildren.find(isMethodOption)
  if (method !== undefined) return namesReadingMethod(method)
  return !options.namedChildren.some((option) => option.type === SPREAD_TYPE)
}

const typeOfRequest = (call: SyntaxNode): CodeBlockType => (isReadingRequest(call) ? "data-fetch" : "request")

const typeOfGlobalCall = (call: SyntaxNode, reader: CallReader): CodeBlockType | null => {
  const callee = call.childForFieldName("function")
  if (callee === null) return null
  const root = rootOf(callee)
  if (root.type !== NAME_TYPE || !reader.isGlobal(root)) return null
  if (callee.type === NAME_TYPE) return callee.text === REQUEST_GLOBAL ? typeOfRequest(call) : null
  return CALLED_GLOBALS.get(root.text) ?? null
}

const isProvidingValue = (call: SyntaxNode, reader: CallReader): boolean => reader.naming.blockAt(call)?.isProviding ?? false

const typeOfHandedCall = (call: SyntaxNode, place: EffectPlace, reader: CallReader): CodeBlockType | null => {
  if (isLanguageMethod(call) || isProvidingValue(call, reader) || listCallbackSlots(call, reader).length === 0) return null
  if (LISTENING_METHODS.has(methodNameOf(call) ?? "")) return "code-event"
  return place === "component" ? "component-effect" : "effect"
}

export const typeOfCall = (call: SyntaxNode, place: EffectPlace, reader: CallReader): CodeBlockType | null =>
  typeOfGlobalCall(call, reader) ?? typeOfHandedCall(call, place, reader)

export const typeOfConstruction = (construction: SyntaxNode, reader: CallReader): CodeBlockType | null => {
  const constructed = construction.childForFieldName("constructor")
  if (constructed?.type !== NAME_TYPE || !reader.isGlobal(constructed)) return null
  return CONSTRUCTED_GLOBALS.get(constructed.text) ?? null
}

const HANDED_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["effect", "component-effect", "code-event"])

const HANDING_TYPES: ReadonlySet<string> = new Set([CALL_TYPE, CONSTRUCTION_TYPE])

const callHandedThrough = (slotNode: SyntaxNode): SyntaxNode | null => {
  const holder = slotNode.parent?.type === OPTIONS_TYPE ? slotNode.parent : slotNode
  const call = holder.parent?.type === ARGUMENTS_TYPE ? holder.parent.parent : null
  return call !== null && HANDING_TYPES.has(call.type) ? call : null
}

const valueOfSlot = (slot: SyntaxNode): SyntaxNode => (slot.type === PAIR_TYPE ? (slot.childForFieldName("value") ?? slot) : slot)

const isCatalogueSlot = (node: SyntaxNode, reader: CallReader): boolean => reader.naming.slotAt(valueOfSlot(node)) !== null

const findHandedSlot = (node: SyntaxNode, reader: CallReader): CallbackSlot | null => {
  const call = callHandedThrough(node)
  if (call === null || (call.type === CONSTRUCTION_TYPE && !isCatalogueSlot(node, reader))) return null
  const type = typeOfCall(call, "elsewhere", reader)
  if (type === null || !HANDED_TYPES.has(type)) return null
  return listCallbackSlots(call, reader).find((slot) => isSameNode(slot.node, node)) ?? null
}

const findNamedSlot = (option: SyntaxNode, reader: CallReader): CallbackSlot | null => {
  const key = option.type === PAIR_TYPE ? option.childForFieldName("key") : null
  const isNamed = key !== null && option.parent?.type === OPTIONS_TYPE && reader.naming.slotAt(valueOfSlot(option)) !== null
  return isNamed ? { node: option, name: textOfName(key) } : null
}

export const findCallbackSlot = (node: SyntaxNode, reader: CallReader): CallbackSlot | null =>
  findHandedSlot(node, reader) ?? findNamedSlot(node, reader)

const RUNNING_ON_AN_EVENT = "event"

export const catalogueOfSlot = ({ node }: CallbackSlot, reader: CallReader): CodeBlockCatalogue | null => reader.naming.slotAt(valueOfSlot(node))

export const typeOfSlot = (slot: CallbackSlot, reader: CallReader): CodeBlockType => {
  const runs = catalogueOfSlot(slot, reader)?.runs ?? null
  if (runs !== null) return runs === RUNNING_ON_AN_EVENT ? "code-event" : "effect-callback"
  return isEventName(slot.name) ? "code-event" : "effect-callback"
}

const isObjectOfMember = (member: SyntaxNode): boolean =>
  member.parent?.type === MEMBER_TYPE && isSameNode(member.parent.childForFieldName("object"), member)

const isCalled = (member: SyntaxNode): boolean =>
  member.parent?.type === CALL_TYPE && isSameNode(member.parent.childForFieldName("function"), member)

const isEnvironmentRoot = (root: SyntaxNode, reader: CallReader): boolean =>
  (root.type === META_TYPE && root.text === MODULE_META) || (root.type === NAME_TYPE && root.text === PROCESS_GLOBAL && reader.isGlobal(root))

const typeOfEnvironmentRead = (member: SyntaxNode, path: readonly string[]): CodeBlockType | null => {
  if (path[0] !== ENVIRONMENT_MEMBER) return null
  const isWholeEnvironment = path.length === ENVIRONMENT_DEPTH && !isObjectOfMember(member)
  return path.length === VARIABLE_DEPTH || isWholeEnvironment ? "config" : null
}

export const typeOfMember = (member: SyntaxNode, reader: CallReader): CodeBlockType | null => {
  const root = rootOf(member)
  const path = memberPathOf(member)
  if (isEnvironmentRoot(root, reader)) return typeOfEnvironmentRead(member, path)
  if (path.length !== GLOBAL_MEMBER_DEPTH || root.type !== NAME_TYPE || !reader.isGlobal(root)) return null
  if (root.text === DOCUMENT_GLOBAL) return path[0] === COOKIE_MEMBER ? "storage" : null
  return STORAGE_GLOBALS.has(root.text) && !isCalled(member) ? "storage" : null
}
