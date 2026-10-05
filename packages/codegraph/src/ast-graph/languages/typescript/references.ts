import type { GrammarId, SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { containsRange, positionKey, rangeOf } from "@/ast-graph/source-range"
import type { Declaration, SymbolReference, SymbolSpace } from "@/ast-graph/types"
import { readFileVariables } from "./declarations"
import { readImportVariables } from "./imports"
import { nodesMatching, patternOfTypes, TYPE_SPACE, VALUE_AND_TYPE_SPACES, VALUE_SPACE } from "./syntax"

const NAME_PATTERN = patternOfTypes(["identifier", "type_identifier", "shorthand_property_identifier", "shorthand_property_identifier_pattern"])
const IMPORTING_PATTERN = "[(import_statement) (export_statement source: (_))] @node"
const EXPORTED_NAME_PATTERN = "(export_specifier name: (identifier) @node)"
const LABEL_PATTERN = `
(export_specifier alias: (identifier) @node)
(nested_type_identifier name: (type_identifier) @node)
(function_signature name: (identifier) @node)
(tuple_type (required_parameter name: (identifier) @node))
(tuple_type (optional_parameter name: (identifier) @node))
(tuple_type (required_parameter name: (rest_pattern (identifier) @node)))
(export_statement "namespace" (identifier) @node)
`
const TYPE_NAME_TYPE = "type_identifier"
const NO_FILE_PATHS: ReadonlyMap<string, string> = new Map()

export interface NameSyntax {
  readonly labelPattern: string
  readonly unreadPattern: string
}

export const TYPESCRIPT_NAMES: NameSyntax = { labelPattern: LABEL_PATTERN, unreadPattern: IMPORTING_PATTERN }

const startsOf = (nodes: readonly SyntaxNode[]): string[] => nodes.map((node) => positionKey(rangeOf(node).start))

const declarationsIn = (grammar: GrammarId, tree: SyntaxTree): Declaration[] => [
  ...readFileVariables(grammar, tree),
  ...readImportVariables(grammar, tree, NO_FILE_PATHS),
]

export const readReferences = (grammar: GrammarId, tree: SyntaxTree, names: NameSyntax = TYPESCRIPT_NAMES): SymbolReference[] => {
  const declared = declarationsIn(grammar, tree).map((declaration) => positionKey(declaration.range.start))
  const named = new Set([...declared, ...startsOf(nodesMatching(grammar, tree, names.labelPattern))])
  const exported = new Set(startsOf(nodesMatching(grammar, tree, EXPORTED_NAME_PATTERN)))
  const unread = nodesMatching(grammar, tree, names.unreadPattern).map(rangeOf)
  const spacesAt = (start: string, type: string): readonly SymbolSpace[] => {
    if (exported.has(start)) return VALUE_AND_TYPE_SPACES
    return type === TYPE_NAME_TYPE ? TYPE_SPACE : VALUE_SPACE
  }
  return nodesMatching(grammar, tree, NAME_PATTERN).flatMap((node) => {
    const range = rangeOf(node)
    const start = positionKey(range.start)
    if (named.has(start) || unread.some((skipped) => containsRange(skipped, range))) return []
    return [{ name: node.text, range, spaces: spacesAt(start, node.type) }]
  })
}
