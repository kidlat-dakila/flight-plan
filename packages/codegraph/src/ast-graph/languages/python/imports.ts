import * as path from "node:path"
import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import type { SyntaxTree } from "@/ast-graph/parser"
import type { ImportVariable } from "@/ast-graph/types"
import { PYTHON_SPACES, readBindings, type ImportBinding } from "./bindings"

const PACKAGE_FILE_NAME = "__init__"
const MODULE_PATH_SEPARATOR = "."

const modulePathOf = (filePath: string): string[] => {
  const { dir, name } = path.posix.parse(filePath)
  const folders = dir === "" ? [] : dir.split(path.posix.sep)
  return name === PACKAGE_FILE_NAME ? folders : [...folders, name]
}

const isSubmodule = (filePath: string, fromModule: string, importedName: string): boolean => {
  const submodulePath = [...(fromModule === "" ? [] : fromModule.split(MODULE_PATH_SEPARATOR)), importedName]
  const modulePath = modulePathOf(filePath)
  const offset = modulePath.length - submodulePath.length
  return offset >= 0 && submodulePath.every((segment, index) => modulePath[offset + index] === segment)
}

const importVariableOf = (binding: ImportBinding, filePaths: ReadonlyMap<string, string>): ImportVariable => {
  const importedFilePath = filePaths.get(binding.specifier) ?? null
  const isModule = binding.isTakenFromModule && importedFilePath !== null && isSubmodule(importedFilePath, binding.fromModule, binding.importedName)
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
