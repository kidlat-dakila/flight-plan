import type { CodeBlockCatalogue, CodeBlockDiff, CodeBlockType, DiffKind, SourceRange, SymbolUse } from "./types"

export interface StoredSymbolMember {
  readonly path: readonly string[]
  readonly blockId: string | null
}

export interface StoredSymbolUsage {
  readonly usedAt: SourceRange
  readonly use: SymbolUse
  readonly handedToId?: string | null
  readonly member?: StoredSymbolMember
}

export interface StoredInternalVariableSymbol extends StoredSymbolUsage {
  readonly type: "internal-variable"
  readonly lineOfCodeReference: SourceRange
}

export interface StoredInternalCodeBlockSymbol extends StoredSymbolUsage {
  readonly type: "internal-code-block"
  readonly codeBlockId: string
}

export interface StoredExternalVariableSymbol extends StoredSymbolUsage {
  readonly type: "external-variable"
  readonly lineOfCodeReference: SourceRange
  readonly filePath: string
}

export interface StoredExternalBlockSymbol extends StoredSymbolUsage {
  readonly type: "external-block"
  readonly codeBlockId: string
}

export interface StoredUnopenedImportSymbol extends StoredSymbolUsage {
  readonly type: "unopened-import"
  readonly specifier: string
  readonly importedName: string
  readonly isLibrary: boolean
}

export type StoredCodeBlockSymbol
  = | StoredInternalVariableSymbol
    | StoredInternalCodeBlockSymbol
    | StoredExternalVariableSymbol
    | StoredExternalBlockSymbol
    | StoredUnopenedImportSymbol

export interface StoredSymbolPlace {
  readonly blockId: string
  readonly symbolIndex: number
}

export interface StoredCodeBlock {
  readonly id: string
  readonly name?: string
  readonly type: CodeBlockType
  readonly lineOfCodeRangeReference: readonly SourceRange[]
  readonly parentBlockId: string | null
  readonly childrenBlockIds: readonly string[]
  readonly isRoot: boolean
  readonly isExported: boolean
  readonly exportedByFilePaths: readonly string[]
  readonly lineOfCodeDiffs: readonly SourceRange[] | null
  readonly diffs: readonly CodeBlockDiff[]
  readonly diffSourceIds: readonly string[]
  readonly outerSymbols: readonly StoredCodeBlockSymbol[]
  readonly usedByIds: readonly string[]
  readonly nextBlockIds: readonly string[]
  readonly handedFrom: readonly StoredSymbolPlace[]
  readonly filePath: string
  readonly catalogue: CodeBlockCatalogue | null
}

export type StoredExports = Readonly<Record<string, string | SourceRange>>

export interface StoredASTGraph {
  readonly filePath: string
  readonly codeBlockIds: readonly string[]
  readonly rootBlockIds: readonly string[]
  readonly diffBlockIds: readonly string[]
  readonly diffContains: readonly DiffKind[]
  readonly renderRootBlockIds?: readonly string[]
  readonly externalSymbols: readonly StoredSymbolPlace[]
  readonly externalBlockIds: readonly string[]
  readonly exports: StoredExports
}

export interface StoredCodeGroupGraph {
  readonly astGraphs: readonly StoredASTGraph[]
  readonly rootASTGraphFilePaths: readonly string[]
  readonly codeBlocks: readonly StoredCodeBlock[]
  readonly diffBlockIds: readonly string[]
  readonly diffContains: readonly DiffKind[]
  readonly chainContains: readonly DiffKind[]
  readonly diffChainIds: readonly string[]
}
