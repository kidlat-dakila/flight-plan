import { parseWithGrammar, queryCaptures, type GrammarId, type QueryCapture, type SyntaxNode } from "@/ast-graph/parser"
import { hasExtension } from "./language"
import { readVueScripts, type VueScript } from "./vue-script"

const VUE_EXTENSIONS = [".vue"]
const TSX_GRAMMAR_EXTENSIONS = [".tsx", ".jsx", ".js", ".mjs", ".cjs"]

const SPECIFIER_CAPTURE = "specifier"
const TYPE_IMPORT_CAPTURE = "typeImport"
const COMMENT_CAPTURE = "comment"

const IMPORT_QUERY = `
(import_statement source: (string) @${SPECIFIER_CAPTURE})
(export_statement source: (string) @${SPECIFIER_CAPTURE})
(import_require_clause source: (string) @${SPECIFIER_CAPTURE})
(program
  (export_statement declaration: (import_alias))
  .
  (expression_statement (parenthesized_expression (string) @${SPECIFIER_CAPTURE})))
(call_expression
  function: (identifier) @callee
  arguments: (arguments . [(string) (template_string)] @${SPECIFIER_CAPTURE})
  (#eq? @callee "require"))
(call_expression
  function: (import)
  arguments: (arguments . (string) @${TYPE_IMPORT_CAPTURE}))
(program (comment) @${COMMENT_CAPTURE})
`

const TYPE_ONLY_NODES: ReadonlySet<string> = new Set([
  "type_alias_declaration",
  "type_annotation",
  "type_query",
  "type_arguments",
  "type_predicate_annotation",
  "asserts_annotation",
  "constraint",
  "default_type",
  "implements_clause",
  "extends_type_clause",
])
const CAST_NODES: ReadonlySet<string> = new Set(["as_expression", "satisfies_expression"])
const SUBSTITUTION_NODE = "template_substitution"
const REFERENCE_PATH_PATTERN = /^\/\/\/\s*<reference\s+path\s*=\s*["']([^"']+)["']/
const RELATIVE_PREFIXES = [".", "/"]
const CURRENT_FOLDER_PREFIX = "./"

const unquoted = (literal: string): string => literal.slice(1, -1)

const hasSubstitution = (node: SyntaxNode): boolean => node.namedChildren.some((child) => child.type === SUBSTITUTION_NODE)

const isTypeSideOf = (parent: SyntaxNode, child: SyntaxNode): boolean =>
  TYPE_ONLY_NODES.has(parent.type) || (CAST_NODES.has(parent.type) && parent.firstNamedChild?.id !== child.id)

const isInTypePosition = (node: SyntaxNode): boolean => {
  for (let child = node, { parent } = node; parent !== null; child = parent, { parent } = parent) {
    if (isTypeSideOf(parent, child)) return true
  }
  return false
}

const referencedPathOf = (comment: string): string | null => {
  const referenced = REFERENCE_PATH_PATTERN.exec(comment)?.[1]
  if (referenced === undefined) return null
  return RELATIVE_PREFIXES.some((prefix) => referenced.startsWith(prefix)) ? referenced : `${CURRENT_FOLDER_PREFIX}${referenced}`
}

const specifierOf = ({ name, node }: QueryCapture): string | null => {
  if (name === SPECIFIER_CAPTURE) return hasSubstitution(node) ? null : unquoted(node.text)
  if (name === TYPE_IMPORT_CAPTURE) return isInTypePosition(node) ? unquoted(node.text) : null
  if (name === COMMENT_CAPTURE) return referencedPathOf(node.text)
  return null
}

const distinct = (specifiers: readonly (string | null)[]): string[] =>
  [...new Set(specifiers.filter((specifier): specifier is string => specifier !== null && specifier !== ""))]

const readSpecifiersIn = (grammar: GrammarId, text: string): string[] => {
  const tree = parseWithGrammar(grammar, text)
  return distinct(queryCaptures(grammar, tree.rootNode, IMPORT_QUERY).map(specifierOf))
}

const readScriptSpecifiers = ({ grammar, text, source }: VueScript): string[] => [
  ...(source === null ? [] : [source]),
  ...readSpecifiersIn(grammar, text),
]

const grammarOf = (filePath: string): GrammarId => (hasExtension(filePath, TSX_GRAMMAR_EXTENSIONS) ? "tsx" : "typescript")

export const readImportSpecifiers = (filePath: string, text: string): string[] =>
  hasExtension(filePath, VUE_EXTENSIONS)
    ? distinct(readVueScripts(text).flatMap(readScriptSpecifiers))
    : readSpecifiersIn(grammarOf(filePath), text)
