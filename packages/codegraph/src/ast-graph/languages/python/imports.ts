import * as path from "node:path"
import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import type { SyntaxTree } from "@/ast-graph/parser"
import type { ImportVariable } from "@/ast-graph/types"
import { PYTHON_SPACES, readBindings, type ImportBinding } from "./bindings"

const PACKAGE_FILE_NAME = "__init__"

const isModuleNamed = (filePath: string, name: string): boolean => {
  const { dir, name: fileName } = path.posix.parse(filePath)
  return fileName === name || (fileName === PACKAGE_FILE_NAME && path.posix.basename(dir) === name)
}

const importVariableOf = (binding: ImportBinding, filePaths: ReadonlyMap<string, string>): ImportVariable => {
  const importedFilePath = filePaths.get(binding.specifier) ?? null
  const isModule = binding.isTakenFromModule && importedFilePath !== null && isModuleNamed(importedFilePath, binding.importedName)
  return {
    name: binding.name.text,
    importedName: isModule ? NAMESPACE_IMPORT : binding.importedName,
    specifier: binding.specifier,
    importedFilePath,
    range: binding.range,
    scope: binding.scope,
    spaces: PYTHON_SPACES,
  }
}

export const readImportVariables = (tree: SyntaxTree, filePaths: ReadonlyMap<string, string>): ImportVariable[] =>
  readBindings(tree).imports.map((binding) => importVariableOf(binding, filePaths))
