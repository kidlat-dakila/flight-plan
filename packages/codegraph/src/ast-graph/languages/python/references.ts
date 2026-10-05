import type { SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching } from "@/ast-graph/query-nodes"
import { containsRange, positionKey, rangeOf } from "@/ast-graph/source-range"
import type { SymbolReference } from "@/ast-graph/types"
import { PYTHON_GRAMMAR, PYTHON_SPACES, readBindings } from "./bindings"
import { isClass, scopeOwnerOf } from "./scopes"

const NAME_PATTERN = "(identifier) @node"
const IMPORTING_PATTERN = "[(import_statement) (import_from_statement) (future_import_statement)] @node"
const LABEL_PATTERN = `
(attribute attribute: (identifier) @node)
(keyword_argument name: (identifier) @node)
(global_statement (identifier) @node)
(nonlocal_statement (identifier) @node)
(dotted_name (identifier) (identifier) @node)
(keyword_pattern . (identifier) @node)
`

const classNameKey = (owner: SyntaxNode, name: string): string => [owner.id, name].join(":")

const isBoundByItsClass = (node: SyntaxNode, name: string, classNameKeys: ReadonlySet<string>): boolean => {
  const owner = scopeOwnerOf(node)
  return isClass(owner) && classNameKeys.has(classNameKey(owner, name))
}

export const readReferences = (tree: SyntaxTree): SymbolReference[] => {
  const { variables, imports, classNames } = readBindings(tree)
  const labels = [...nodesMatching(PYTHON_GRAMMAR, tree, LABEL_PATTERN), ...classNames.map(({ name }) => name)].map(rangeOf)
  const named = new Set([...variables, ...imports].map(({ range }) => range).concat(labels).map((range) => positionKey(range.start)))
  const unread = nodesMatching(PYTHON_GRAMMAR, tree, IMPORTING_PATTERN).map(rangeOf)
  const classNameKeys = new Set(classNames.map(({ text, owner }) => classNameKey(owner, text)))
  const namesOfClasses = new Set(classNames.map(({ text }) => text))
  return nodesMatching(PYTHON_GRAMMAR, tree, NAME_PATTERN).flatMap((node) => {
    const range = rangeOf(node)
    if (named.has(positionKey(range.start)) || unread.some((skipped) => containsRange(skipped, range))) return []
    const name = node.text
    return namesOfClasses.has(name) && isBoundByItsClass(node, name, classNameKeys) ? [] : [{ name, range, spaces: PYTHON_SPACES }]
  })
}
