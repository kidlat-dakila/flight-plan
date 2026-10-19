import { readJsxSyntax } from "@/ast-graph/languages/jsx"
import { readTypescriptSyntax } from "@/ast-graph/languages/typescript"
import { parseWithGrammar, type GrammarId, type SyntaxNode, type SyntaxTree } from "@/ast-graph/parser"
import { containsRange, rangeOf } from "@/ast-graph/source-range"
import type { SymbolSpace } from "@/ast-graph/types"
import { exportedBindingAt, javascriptReaderOf, listHandedImports } from "@/catalogue/matching/javascript-reader"
import { matchSyntax } from "@/catalogue/matching/match-source"
import { findNothingHanded, type Binding, type FindExportedBinding, type FindHandedExport, type SyntaxReader } from "@/catalogue/matching/syntax-reader"
import { listLibraryUses } from "@/code-blocks/classifications"
import { LIBRARIES } from "@/code-blocks/libraries"
import { listOwnUses, nodeFinderOf, withCards } from "@/code-blocks/libraries/cards"
import type { FileExports, FindExport, OutlinedFile, ScriptReading } from "@/code-blocks/reading"
import { fromSyntaxRange, toSyntaxRange } from "@/code-blocks/source-range"
import type { SourceRange } from "@/code-blocks/types"
import { readBlocks, type BlockReader } from "./blocks"
import { withDirectives } from "./directives"
import { findMadeBlock } from "./made-by"
import { createFileNaming, type FileNaming } from "./named-by"
import { isFileWideDeclaration, readOutline, resolutionOf, type FileOutline, type Resolution } from "./outline"
import { nodeAtRange } from "./syntax"
import { readUses } from "./uses"

export interface TypescriptSource {
  readonly filePath: string
  readonly source: string
  readonly importedFilePaths: ReadonlyMap<string, string>
}

const VALUE_SPACE: SymbolSpace = "value"
const JSX_GRAMMAR: GrammarId = "tsx"
const FUNCTION_TYPE = "function"
const ARGUMENT = "argument"

export const exportsOf = ({ localExports, forwardedExports }: FileOutline): FileExports => ({
  local: localExports.map(({ exportedName, declaration }) => ({
    exportedName,
    declarationRange: fromSyntaxRange(declaration.range),
    isFunction: declaration.type === FUNCTION_TYPE,
  })),
  forwarded: forwardedExports,
})

const isDeclaredOutside = (outline: FileOutline, resolution: Resolution, isComponentBody: boolean): boolean =>
  resolution.kind === "import" || (!isComponentBody && isFileWideDeclaration(outline, resolution.declaration))

export interface ReadScript {
  readonly grammar: GrammarId
  readonly filePath: string
  readonly outline: FileOutline
  readonly componentId: string | null
}

const createBlockReader = ({ filePath, outline, componentId }: ReadScript, findExport: FindExport, naming: FileNaming): BlockReader => ({
  filePath,
  outline,
  naming,
  isGlobal: (name) => resolutionOf(outline, name) === null,
  leadsToFunction: (name) => {
    const resolution = resolutionOf(outline, name)
    if (resolution === null) return false
    if (resolution.kind === "local") return resolution.declaration.type === FUNCTION_TYPE && resolution.declaration.declarationType !== ARGUMENT
    const { importedFilePath, importedName } = resolution.variable
    return importedFilePath !== null && (findExport(importedFilePath, importedName)?.isFunction ?? false)
  },
  findMade: (value) => findMadeBlock(value, outline, LIBRARIES),
  comesFromOutside: (value: SyntaxNode) => {
    const range = rangeOf(value)
    return outline.resolved.some(
      ({ reference, resolution }) =>
        reference.spaces.includes(VALUE_SPACE) && containsRange(range, reference.range) && isDeclaredOutside(outline, resolution, componentId !== null),
    )
  },
})

const scriptReaderOf = ({ grammar, filePath, outline }: ReadScript, findBinding: FindExportedBinding, findHanded: FindHandedExport): SyntaxReader =>
  javascriptReaderOf(grammar, outline, findBinding, (moduleNames) => findHanded(filePath, moduleNames))

export const readScript = (script: ReadScript, findExport: FindExport, findBinding: FindExportedBinding, findHanded: FindHandedExport = findNothingHanded): ScriptReading => {
  const { filePath, outline, componentId } = script
  const matches = matchSyntax(scriptReaderOf(script, findBinding, findHanded), LIBRARIES)
  const blocks = readBlocks(createBlockReader(script, findExport, createFileNaming(matches)), componentId)
  return {
    filePath,
    blocks: withCards(withDirectives(blocks, matches, exportsOf(outline)), matches, outline.tree, LIBRARIES),
    uses: readUses(outline),
    libraryUses: [...listLibraryUses(matches, LIBRARIES), ...listOwnUses(blocks, matches, outline.tree, LIBRARIES)],
  }
}

export const bindingInScript = ({ grammar, outline }: ReadScript, declarationRange: SourceRange, findBinding: FindExportedBinding): Binding | null =>
  exportedBindingAt(javascriptReaderOf(grammar, outline, findBinding), nodeAtRange(outline.tree, toSyntaxRange(declarationRange)))

export interface TypescriptFile {
  readonly filePath: string
  readonly importedFilePaths: ReadonlyMap<string, string>
}

export const outlineTypescriptTree = (grammar: GrammarId, tree: SyntaxTree, { filePath, importedFilePaths }: TypescriptFile): OutlinedFile => {
  const script: ReadScript = { grammar, filePath, outline: readOutline(grammar, tree, importedFilePaths), componentId: null }
  return {
    filePath,
    exports: exportsOf(script.outline),
    read: (findExport, findBinding, findHanded) => ({
      ...readScript(script, findExport, findBinding, findHanded),
      readSyntax: () => (grammar === JSX_GRAMMAR ? readJsxSyntax(tree, importedFilePaths) : readTypescriptSyntax(tree, importedFilePaths)),
      nodeAt: nodeFinderOf(tree),
    }),
    bindingAt: (declarationRange, findBinding) => bindingInScript(script, declarationRange, findBinding),
    handingsOf: (handedPath, moduleNames, findBinding, findHanded) =>
      listHandedImports({ grammar, outline: script.outline, importedFilePaths, reader: scriptReaderOf(script, findBinding, findHanded) }, handedPath, moduleNames),
  }
}

export const outlineTypescript = (grammar: GrammarId, source: TypescriptSource): OutlinedFile =>
  outlineTypescriptTree(grammar, parseWithGrammar(grammar, source.source), source)
