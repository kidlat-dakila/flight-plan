import type { SyntaxNode } from "@/ast-graph/parser"

export interface WrittenAttribute {
  readonly node: SyntaxNode
  readonly name: string
  readonly value: SyntaxNode | null
  readonly isQuoted: boolean
}

const ELEMENT_TYPE = "element"
const TAG_TYPES: ReadonlySet<string> = new Set(["start_tag", "self_closing_tag"])
const TAG_NAME_TYPE = "tag_name"
const ATTRIBUTE_TYPE = "attribute"
const ATTRIBUTE_NAME_TYPE = "attribute_name"
const VALUE_TYPE = "attribute_value"
const QUOTED_VALUE_TYPE = "quoted_attribute_value"
const LISTENING_PREFIXES: readonly string[] = ["v-on:", "@"]
const BINDING_PREFIXES: readonly string[] = ["v-bind:", ":"]
const SLOT_PREFIXES: readonly string[] = ["#", "v-slot"]
const DIRECTIVE_PREFIX = "v-"
const MODIFIER_MARK = "."
const WORD_BREAK_PATTERN = /-(\w)/g
const COMPONENT_TAG_PATTERN = /^[A-Z]|-|\./
const EVENT_PREFIX = "on"
const LOOP_DIRECTIVE = "v-for"
const CONDITION_DIRECTIVES: ReadonlySet<string> = new Set(["v-if", "v-else-if", "v-else", "v-show"])
const UNREAD_DIRECTIVES: ReadonlySet<string> = new Set(["v-else", "v-pre", "v-once", "v-cloak"])

const withoutPrefix = (name: string, prefixes: readonly string[]): string | null => {
  const prefix = prefixes.find((candidate) => name.startsWith(candidate))
  return prefix === undefined ? null : name.slice(prefix.length)
}

const withoutModifiers = (name: string): string => name.split(MODIFIER_MARK)[0]

export const camelCased = (name: string): string => name.replace(WORD_BREAK_PATTERN, (_match, letter: string) => letter.toUpperCase())

export const capitalised = (name: string): string => `${name.charAt(0).toUpperCase()}${name.slice(1)}`

export const eventNameOf = (event: string): string => `${EVENT_PREFIX}${capitalised(camelCased(event))}`

export const listChildElements = (element: SyntaxNode): SyntaxNode[] => element.namedChildren.filter((child) => child.type === ELEMENT_TYPE)

export const tagOf = (element: SyntaxNode): SyntaxNode | null => element.namedChildren.find((child) => TAG_TYPES.has(child.type)) ?? null

export const tagNameOf = (element: SyntaxNode): SyntaxNode | null => tagOf(element)?.namedChildren.find((child) => child.type === TAG_NAME_TYPE) ?? null

const attributeOf = (node: SyntaxNode): WrittenAttribute[] => {
  const name = node.namedChildren.find((child) => child.type === ATTRIBUTE_NAME_TYPE)
  const written = node.namedChildren.find((child) => child.type === QUOTED_VALUE_TYPE || child.type === VALUE_TYPE) ?? null
  const value = written?.type === QUOTED_VALUE_TYPE ? written.firstNamedChild : written
  return name === undefined ? [] : [{ node, name: name.text, value, isQuoted: written?.type === QUOTED_VALUE_TYPE }]
}

export const listAttributes = (element: SyntaxNode): WrittenAttribute[] =>
  (tagOf(element)?.namedChildren ?? []).filter((child) => child.type === ATTRIBUTE_TYPE).flatMap(attributeOf)

export const listenedEventOf = ({ name }: WrittenAttribute): string | null => {
  const event = withoutPrefix(name, LISTENING_PREFIXES)
  return event === null || event === "" ? null : withoutModifiers(event)
}

export const boundNameOf = ({ name }: WrittenAttribute): string | null => {
  const bound = withoutPrefix(name, BINDING_PREFIXES)
  return bound === null || bound === "" ? null : camelCased(withoutModifiers(bound))
}

export const handedNameOf = (attribute: WrittenAttribute): string | null => {
  const event = listenedEventOf(attribute)
  return event === null ? boundNameOf(attribute) : eventNameOf(event)
}

export const isHandler = (attribute: WrittenAttribute): boolean => listenedEventOf(attribute) !== null

export const isSlotProperties = ({ name }: WrittenAttribute): boolean => SLOT_PREFIXES.some((prefix) => name.startsWith(prefix))

export const isLoop = ({ name }: WrittenAttribute): boolean => name === LOOP_DIRECTIVE

export const isCondition = ({ name }: WrittenAttribute): boolean => CONDITION_DIRECTIVES.has(name)

export const isExpression = (attribute: WrittenAttribute): boolean => {
  const { name } = attribute
  if (isHandler(attribute) || isSlotProperties(attribute) || UNREAD_DIRECTIVES.has(name)) return false
  return name.startsWith(DIRECTIVE_PREFIX) || boundNameOf(attribute) !== null
}

export const isComponentTag = (tagName: string): boolean => COMPONENT_TAG_PATTERN.test(tagName)
