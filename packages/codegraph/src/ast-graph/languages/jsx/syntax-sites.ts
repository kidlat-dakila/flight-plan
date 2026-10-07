import { joinRoutePath } from "@/ast-graph/languages/typescript/route-paths"
import { isQuoted, leftmostIdentifierOf, unquoted } from "@/ast-graph/languages/typescript/syntax"
import { readSyntaxSites } from "@/ast-graph/languages/typescript/syntax-sites"
import type { SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching } from "@/ast-graph/query-nodes"
import { rangeOf } from "@/ast-graph/source-range"
import type { AttributeSite, ElementSite, MarkupSite, PageSite, SymbolTarget, SyntaxSite } from "@/ast-graph/types"
import { JSX_GRAMMAR } from "./references"

const ELEMENT_NAME_PATTERN = "(jsx_opening_element name: (_) @node)\n(jsx_self_closing_element name: (_) @node)"
export const MARKUP_PATTERN = "[(jsx_element) (jsx_self_closing_element)] @node"
const ATTRIBUTE_PATTERN = "(jsx_attribute) @node"

const IDENTIFIER_TYPE = "identifier"
const OPENING_TAG_TYPE = "jsx_opening_element"
const TEXT_TYPE = "jsx_text"
const ATTRIBUTE_TYPE = "jsx_attribute"
const PATH_ATTRIBUTE = "path"
const INDEX_ATTRIBUTE = "index"
const PAGE_ATTRIBUTES: ReadonlySet<string> = new Set(["element", "Component", "component"])
const BUILT_IN_NAME = /^[a-z]/u
const NAMELESS_ELEMENT = ""
const WORD_SEPARATOR = " "

const isBuiltInName = (name: SyntaxNode | null): boolean =>
  name === null || (name.type !== "member_expression" && BUILT_IN_NAME.test(name.text))

const toElementSite = (name: SyntaxNode): ElementSite[] => (isBuiltInName(name) ? [] : [{ kind: "element", range: rangeOf(name) }])

const toMarkupSite = (node: SyntaxNode): MarkupSite => ({ kind: "markup", range: rangeOf(node) })

const targetOfName = (name: SyntaxNode | null): SymbolTarget | null => {
  if (name === null) return null
  const leftmost = leftmostIdentifierOf(name)
  return leftmost.type === IDENTIFIER_TYPE ? { name: leftmost.text, range: rangeOf(leftmost) } : null
}

const textInside = (tag: SyntaxNode): string | null => {
  const element = tag.type === OPENING_TAG_TYPE ? tag.parent : null
  const words = (element?.namedChildren ?? [])
    .filter((child) => child.type === TEXT_TYPE)
    .map((child) => child.text.trim())
    .filter((text) => text.length > 0)
  return words.length === 0 ? null : words.join(WORD_SEPARATOR)
}

const toAttributeSite = (node: SyntaxNode): AttributeSite[] => {
  const tag = node.parent
  const name = node.firstNamedChild
  if (tag === null || name === null) return []
  const elementName = tag.childForFieldName("name")
  return [
    {
      kind: "attribute",
      range: rangeOf(node),
      element: elementName?.text ?? NAMELESS_ELEMENT,
      elementName: isBuiltInName(elementName) ? null : targetOfName(elementName),
      attribute: name.text,
      isBuiltIn: isBuiltInName(elementName),
      text: textInside(tag),
    },
  ]
}

const attributeNamed = (tag: SyntaxNode, name: string): SyntaxNode | null =>
  tag.namedChildren.find((child) => child.type === ATTRIBUTE_TYPE && child.firstNamedChild?.text === name) ?? null

const routePathOfTag = (tag: SyntaxNode): string | null => {
  const path = attributeNamed(tag, PATH_ATTRIBUTE)?.lastNamedChild ?? null
  if (path !== null && isQuoted(path)) return joinRoutePath([unquoted(path.text)])
  return attributeNamed(tag, INDEX_ATTRIBUTE) === null ? null : joinRoutePath([])
}

const toPageSite = (attribute: SyntaxNode): PageSite[] => {
  const isPage = PAGE_ATTRIBUTES.has(attribute.firstNamedChild?.text ?? "")
  const path = isPage && attribute.parent !== null ? routePathOfTag(attribute.parent) : null
  return path === null ? [] : [{ kind: "page", range: rangeOf(attribute), path }]
}

export const readJsxSyntaxSites = (tree: SyntaxTree): SyntaxSite[] => [
  ...readSyntaxSites(JSX_GRAMMAR, tree),
  ...nodesMatching(JSX_GRAMMAR, tree, ELEMENT_NAME_PATTERN).flatMap(toElementSite),
  ...nodesMatching(JSX_GRAMMAR, tree, MARKUP_PATTERN).map(toMarkupSite),
  ...nodesMatching(JSX_GRAMMAR, tree, ATTRIBUTE_PATTERN).flatMap(toAttributeSite),
  ...nodesMatching(JSX_GRAMMAR, tree, ATTRIBUTE_PATTERN).flatMap(toPageSite),
]
