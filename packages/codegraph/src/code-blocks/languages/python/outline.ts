import { readFileVariables } from "@/ast-graph/languages/python/declarations"
import { readImportVariables } from "@/ast-graph/languages/python/imports"
import { readReferences } from "@/ast-graph/languages/python/references"
import type { SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { containsRange, isSameRange, positionKey, rangeOf } from "@/ast-graph/source-range"
import type { FileVariable, ImportVariable, SourceRange as SyntaxRange } from "@/ast-graph/types"
import { resolveAll, type ResolvedReference, type Resolution } from "@/code-blocks/languages/typescript/outline"

export interface PythonOutline {
  readonly tree: SyntaxTree
  readonly declarations: readonly FileVariable[]
  readonly imports: readonly ImportVariable[]
  readonly resolved: readonly ResolvedReference[]
  readonly resolutionByStart: ReadonlyMap<string, Resolution>
}

const ARGUMENT: FileVariable["declarationType"] = "argument"

export const readPythonOutline = (tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): PythonOutline => {
  const declarations = readFileVariables(tree)
  const imports = readImportVariables(tree, importedFilePaths)
  const candidates: readonly Resolution[] = [
    ...declarations.map((declaration): Resolution => ({ kind: "local", declaration })),
    ...imports.map((variable): Resolution => ({ kind: "import", variable })),
  ]
  const resolved = resolveAll(candidates, readReferences(tree))
  return {
    tree,
    declarations,
    imports,
    resolved,
    resolutionByStart: new Map(resolved.map(({ reference, resolution }) => [positionKey(reference.range.start), resolution] as const)),
  }
}

const moduleRangeOf = ({ tree }: PythonOutline): SyntaxRange => rangeOf(tree.rootNode)

export const isModuleWide = (outline: PythonOutline, { scope, declarationType }: FileVariable): boolean =>
  declarationType !== ARGUMENT && isSameRange(scope, moduleRangeOf(outline))

export const isModuleWideImport = (outline: PythonOutline, { scope }: ImportVariable): boolean => isSameRange(scope, moduleRangeOf(outline))

export const resolutionAt = (outline: PythonOutline, name: SyntaxNode): Resolution | null =>
  outline.resolutionByStart.get(positionKey(rangeOf(name).start)) ?? null

const isDeclaredOutside = (outline: PythonOutline, resolution: Resolution): boolean =>
  resolution.kind === "import" || isModuleWide(outline, resolution.declaration)

export const namesOutside = (outline: PythonOutline, value: SyntaxNode): boolean => {
  const range = rangeOf(value)
  return outline.resolved.some(({ reference, resolution }) => containsRange(range, reference.range) && isDeclaredOutside(outline, resolution))
}
