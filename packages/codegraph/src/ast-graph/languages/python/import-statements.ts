import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import type { SyntaxNode } from "@/ast-graph/parser"
import { pythonSpecifierOf } from "@/import-graph/languages/python-specifiers"

export interface ImportedName {
  readonly name: SyntaxNode
  readonly importedName: string
  readonly specifier: string
  readonly isTakenFromModule: boolean
}

interface ImportedModule {
  readonly module: string
  readonly level: number
}

const FROM_IMPORT_TYPE = "import_from_statement"
const ALIASED_TYPE = "aliased_import"
const RELATIVE_TYPE = "relative_import"
const PREFIX_TYPE = "import_prefix"
const DOTTED_NAME_TYPE = "dotted_name"
const NAME_FIELD = "name"
const NO_NAME = ""
const ABSOLUTE_LEVEL = 0

const importedPathOf = (imported: SyntaxNode): SyntaxNode | null =>
  imported.type === ALIASED_TYPE ? imported.childForFieldName(NAME_FIELD) : imported

const boundNameOf = (imported: SyntaxNode): SyntaxNode | null =>
  imported.type === ALIASED_TYPE ? imported.childForFieldName("alias") : imported.firstNamedChild

const moduleOf = (moduleName: SyntaxNode | null): ImportedModule => {
  if (moduleName === null) return { module: NO_NAME, level: ABSOLUTE_LEVEL }
  if (moduleName.type !== RELATIVE_TYPE) return { module: moduleName.text, level: ABSOLUTE_LEVEL }
  const prefix = moduleName.namedChildren.find((child) => child.type === PREFIX_TYPE)
  const dottedName = moduleName.namedChildren.find((child) => child.type === DOTTED_NAME_TYPE)
  return { module: dottedName?.text ?? NO_NAME, level: prefix?.text.length ?? ABSOLUTE_LEVEL }
}

const readImportedModule = (imported: SyntaxNode): ImportedName[] => {
  const name = boundNameOf(imported)
  const module = importedPathOf(imported)?.text ?? NO_NAME
  if (name === null) return []
  const specifier = pythonSpecifierOf({ module, level: ABSOLUTE_LEVEL, imported: NO_NAME })
  return [{ name, importedName: NAMESPACE_IMPORT, specifier, isTakenFromModule: false }]
}

const readNameFrom = (from: ImportedModule, imported: SyntaxNode): ImportedName[] => {
  const name = boundNameOf(imported)
  const importedName = importedPathOf(imported)?.text ?? NO_NAME
  if (name === null) return []
  return [{ name, importedName, specifier: pythonSpecifierOf({ ...from, imported: importedName }), isTakenFromModule: true }]
}

export const importedNamesOf = (statement: SyntaxNode): ImportedName[] => {
  const imported = statement.childrenForFieldName(NAME_FIELD)
  if (statement.type !== FROM_IMPORT_TYPE) return imported.flatMap(readImportedModule)
  const from = moduleOf(statement.childForFieldName("module_name"))
  return imported.flatMap((name) => readNameFrom(from, name))
}
