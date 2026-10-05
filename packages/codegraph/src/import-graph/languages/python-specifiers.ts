import { parseWithGrammar, queryCaptures, type SyntaxNode } from "@/ast-graph/parser"

export interface PythonImport {
  readonly module: string
  readonly level: number
  readonly imported: string
}

const IMPORT_CAPTURE = "import"
const FROM_IMPORT_CAPTURE = "fromImport"
const IMPORT_QUERY = `
(import_statement) @${IMPORT_CAPTURE}
(import_from_statement) @${FROM_IMPORT_CAPTURE}
`

const NAME_FIELD = "name"
const MODULE_FIELD = "module_name"
const ALIASED_IMPORT_NODE = "aliased_import"
const RELATIVE_IMPORT_NODE = "relative_import"
const IMPORT_PREFIX_NODE = "import_prefix"
const DOTTED_NAME_NODE = "dotted_name"
const WILDCARD_NODE = "wildcard_import"
const WILDCARD = "*"
const NO_NAME = ""
const ABSOLUTE_LEVEL = 0

interface ImportedModule {
  readonly module: string
  readonly level: number
}

const LEVEL_MARK = "."
const IMPORTED_NAME_MARK = ":"

export const pythonSpecifierOf = ({ module, level, imported }: PythonImport): string => {
  const from = `${LEVEL_MARK.repeat(level)}${module}`
  return imported === NO_NAME ? from : `${from}${IMPORTED_NAME_MARK}${imported}`
}

const importedNameOf = (node: SyntaxNode): string =>
  node.type === ALIASED_IMPORT_NODE ? (node.childForFieldName(NAME_FIELD)?.text ?? NO_NAME) : node.text

const importedModuleOf = (moduleName: SyntaxNode | null): ImportedModule => {
  if (moduleName === null) return { module: NO_NAME, level: ABSOLUTE_LEVEL }
  if (moduleName.type !== RELATIVE_IMPORT_NODE) return { module: moduleName.text, level: ABSOLUTE_LEVEL }
  const prefix = moduleName.namedChildren.find((child) => child.type === IMPORT_PREFIX_NODE)
  const dottedName = moduleName.namedChildren.find((child) => child.type === DOTTED_NAME_NODE)
  return { module: dottedName?.text ?? NO_NAME, level: prefix?.text.length ?? ABSOLUTE_LEVEL }
}

const readImport = (statement: SyntaxNode): PythonImport[] =>
  statement
    .childrenForFieldName(NAME_FIELD)
    .map((name) => ({ module: importedNameOf(name), level: ABSOLUTE_LEVEL, imported: NO_NAME }))

const readFromImport = (statement: SyntaxNode): PythonImport[] => {
  const from = importedModuleOf(statement.childForFieldName(MODULE_FIELD))
  const named = statement.childrenForFieldName(NAME_FIELD).map((name) => ({ ...from, imported: importedNameOf(name) }))
  const isWildcard = statement.namedChildren.some((child) => child.type === WILDCARD_NODE)
  return isWildcard ? [...named, { ...from, imported: WILDCARD }] : named
}

export const readPythonImports = (text: string): PythonImport[] => {
  const tree = parseWithGrammar("python", text)
  return queryCaptures("python", tree.rootNode, IMPORT_QUERY).flatMap(({ name, node }) =>
    name === IMPORT_CAPTURE ? readImport(node) : readFromImport(node),
  )
}
