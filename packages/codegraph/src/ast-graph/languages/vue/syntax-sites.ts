import { readSyntaxSites } from "@/ast-graph/languages/typescript/syntax-sites"
import { queryCaptures, type SyntaxNode } from "@/ast-graph/parser"
import { rangeOf } from "@/ast-graph/source-range"
import type { AttributeSite, ElementSite, MarkupSite, SourceRange, SymbolTarget, SyntaxSite } from "@/ast-graph/types"
import {
  boundNameOf,
  camelCased,
  capitalised,
  handedNameOf,
  isComponentTag,
  listAttributes,
  listenedEventOf,
  tagNameOf,
  type WrittenAttribute,
} from "./markup"
import type { ParsedScript } from "./script"
import type { Sfc } from "./sfc"
import { rangeWithin } from "./snippet"
import type { ParsedTemplate } from "./template"

const EXPRESSION_GRAMMAR = "typescript"
const ELEMENT_PATTERN = "(element) @node"
const TEXT_TYPE = "text"
const INTERPOLATION_PATTERN = /\{\{[\s\S]*?\}\}/g
const MEMBER_MARK = "."
const WORD_SEPARATOR = " "

const readScriptSites = (scripts: readonly ParsedScript[]): SyntaxSite[] => scripts.flatMap(({ block, tree }) => readSyntaxSites(block.grammar, tree))

const componentNameRangeOf = (tagName: SyntaxNode): SourceRange =>
  rangeWithin(tagName, 0, tagName.text.includes(MEMBER_MARK) ? tagName.text.indexOf(MEMBER_MARK) : tagName.text.length)

const componentTargetOf = (tagName: SyntaxNode): SymbolTarget => ({
  name: tagName.text.includes(MEMBER_MARK) ? tagName.text.slice(0, tagName.text.indexOf(MEMBER_MARK)) : capitalised(camelCased(tagName.text)),
  range: componentNameRangeOf(tagName),
})

const toElementSite = (element: SyntaxNode): ElementSite[] => {
  const tagName = tagNameOf(element)
  return tagName === null || !isComponentTag(tagName.text) ? [] : [{ kind: "element", range: componentNameRangeOf(tagName) }]
}

const toMarkupSite = (element: SyntaxNode): MarkupSite => ({ kind: "markup", range: rangeOf(element) })

const textInside = (element: SyntaxNode): string | null => {
  const words = element.namedChildren
    .filter((child) => child.type === TEXT_TYPE)
    .map((child) => child.text.replace(INTERPOLATION_PATTERN, "").trim())
    .filter((text) => text.length > 0)
  return words.length === 0 ? null : words.join(WORD_SEPARATOR)
}

const isHandedOver = (attribute: WrittenAttribute): boolean => listenedEventOf(attribute) !== null || boundNameOf(attribute) !== null

const toAttributeSite = (element: SyntaxNode, tagName: SyntaxNode, attribute: WrittenAttribute): AttributeSite => {
  const isBuiltIn = !isComponentTag(tagName.text)
  const event = listenedEventOf(attribute)
  return {
    kind: "attribute",
    range: rangeOf(attribute.node),
    element: tagName.text,
    elementName: isBuiltIn ? null : componentTargetOf(tagName),
    attribute: handedNameOf(attribute) ?? attribute.name,
    ...(event === null ? {} : { event }),
    isBuiltIn,
    text: textInside(element),
  }
}

const toAttributeSites = (element: SyntaxNode): AttributeSite[] => {
  const tagName = tagNameOf(element)
  if (tagName === null) return []
  return listAttributes(element).filter(isHandedOver).map((attribute) => toAttributeSite(element, tagName, attribute))
}

const readTemplateSites = (template: SyntaxNode | null, parsed: ParsedTemplate | null): SyntaxSite[] => {
  if (template === null) return []
  const elements = queryCaptures("html", template, ELEMENT_PATTERN).map((capture) => capture.node)
  return [
    ...elements.map(toMarkupSite),
    ...elements.flatMap(toElementSite),
    ...elements.flatMap(toAttributeSites),
    ...(parsed === null ? [] : readSyntaxSites(EXPRESSION_GRAMMAR, parsed.tree)),
  ]
}

export const readVueSyntaxSites = (sfc: Sfc, scripts: readonly ParsedScript[], template: ParsedTemplate | null): SyntaxSite[] => [
  ...readScriptSites(scripts),
  ...readTemplateSites(sfc.template, template),
]
