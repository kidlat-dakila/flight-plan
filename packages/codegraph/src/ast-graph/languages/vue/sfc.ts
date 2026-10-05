import type { GrammarId, SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { rangeOf } from "@/ast-graph/source-range"
import type { SourceRange } from "@/ast-graph/types"

export interface ScriptBlock {
  readonly element: SyntaxNode
  readonly body: SyntaxNode
  readonly isSetup: boolean
  readonly grammar: GrammarId
}

export interface Sfc {
  readonly scripts: readonly ScriptBlock[]
  readonly template: SyntaxNode | null
  readonly fileRange: SourceRange
}

const SCRIPT_TYPE = "script_element"
const ELEMENT_TYPE = "element"
const OPENING_TAG_TYPE = "start_tag"
const BODY_TYPE = "raw_text"
const ATTRIBUTE_TYPE = "attribute"
const TAG_NAME_TYPE = "tag_name"
const VALUE_TYPE = "attribute_value"
const TEMPLATE_TAG = "template"
const SETUP_ATTRIBUTE = "setup"
const LANGUAGE_ATTRIBUTE = "lang"
const TYPESCRIPT_LANGUAGE = "ts"
const FILE_START = { line: 1, column: 0 }

const childOfType = (node: SyntaxNode, type: string): SyntaxNode | null => node.namedChildren.find((child) => child.type === type) ?? null

export const valueOf = (attribute: SyntaxNode): SyntaxNode | null =>
  attribute.descendantsOfType(VALUE_TYPE).find((found) => found.type === VALUE_TYPE) ?? null

export const openingTagOf = (element: SyntaxNode): SyntaxNode | null => childOfType(element, OPENING_TAG_TYPE)

const attributesOf = (element: SyntaxNode): ReadonlyMap<string, string> =>
  new Map(
    (openingTagOf(element)?.namedChildren ?? [])
      .filter((child) => child.type === ATTRIBUTE_TYPE)
      .map((attribute) => [attribute.firstNamedChild?.text ?? "", (valueOf(attribute)?.text ?? "")] as const),
  )

const readScriptBlock = (element: SyntaxNode): ScriptBlock[] => {
  const body = childOfType(element, BODY_TYPE)
  const attributes = attributesOf(element)
  if (body === null) return []
  const grammar = attributes.get(LANGUAGE_ATTRIBUTE)?.toLowerCase() === TYPESCRIPT_LANGUAGE ? "typescript" : "tsx"
  return [{ element, body, isSetup: attributes.has(SETUP_ATTRIBUTE), grammar }]
}

const isTemplate = (block: SyntaxNode): boolean =>
  block.type === ELEMENT_TYPE && childOfType(openingTagOf(block) ?? block, TAG_NAME_TYPE)?.text === TEMPLATE_TAG

export const readSfc = (tree: SyntaxTree): Sfc => {
  const blocks = tree.rootNode.namedChildren
  return {
    scripts: blocks.filter((block) => block.type === SCRIPT_TYPE).flatMap(readScriptBlock),
    template: blocks.find(isTemplate) ?? null,
    fileRange: { start: FILE_START, end: rangeOf(tree.rootNode).end },
  }
}

export const hasSetup = (sfc: Sfc): boolean => sfc.scripts.some((script) => script.isSetup)
