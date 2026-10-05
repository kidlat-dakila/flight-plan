import { readReferences, TYPESCRIPT_NAMES, type NameSyntax } from "@/ast-graph/languages/typescript/references"
import type { SyntaxTree } from "@/ast-graph/parser"
import type { SymbolReference } from "@/ast-graph/types"

export const JSX_GRAMMAR = "tsx"

const BUILT_IN_ELEMENT_NAME = "^[a-z]"
const BUILT_IN_ELEMENT_PATTERN = `
(jsx_opening_element name: (identifier) @node (#match? @node "${BUILT_IN_ELEMENT_NAME}"))
(jsx_self_closing_element name: (identifier) @node (#match? @node "${BUILT_IN_ELEMENT_NAME}"))
(jsx_namespace_name (identifier) @node)
`
const CLOSING_TAG_PATTERN = "(jsx_closing_element) @node"

const JSX_NAMES: NameSyntax = {
  labelPattern: `${TYPESCRIPT_NAMES.labelPattern}${BUILT_IN_ELEMENT_PATTERN}`,
  unreadPattern: `${TYPESCRIPT_NAMES.unreadPattern}\n${CLOSING_TAG_PATTERN}`,
}

export const readJsxReferences = (tree: SyntaxTree): SymbolReference[] => readReferences(JSX_GRAMMAR, tree, JSX_NAMES)
