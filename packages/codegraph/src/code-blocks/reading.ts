import type { SyntaxNode } from "@/ast-graph/parser"
import type { FileSyntax } from "@/ast-graph/types"
import type { Binding, FindExportedBinding, FindHandedExport, HandedCallback } from "@/catalogue/matching/syntax-reader"
import type { BlockCard, CodeBlockCatalogue, CodeBlockType, Position, SourceRange, SymbolUse } from "./types"

export type ArgumentRole = "whole" | "key" | "member"

export interface ReadArgument {
  readonly parameterIndex: number
  readonly role: ArgumentRole
}

export interface ReadBlock {
  readonly id: string
  readonly name?: string
  readonly type: CodeBlockType
  readonly ranges: readonly SourceRange[]
  readonly parentId: string | null
  readonly declaredAt: readonly Position[]
  readonly argument?: ReadArgument
  readonly isParameter?: boolean
  readonly isReturned?: boolean
  readonly isPlain?: boolean
  readonly isParameterProperty?: boolean
  readonly isAnnotatedAlias?: boolean
  readonly holdsMarkup?: boolean
  readonly catalogue?: CodeBlockCatalogue
  readonly card?: BlockCard
  readonly memberPath?: readonly string[]
}

export interface LocalTarget {
  readonly kind: "local"
  readonly declarationRange: SourceRange
}

export interface ImportTarget {
  readonly kind: "import"
  readonly specifier: string
  readonly importedName: string
  readonly filePath: string | null
}

export type ReadTarget = LocalTarget | ImportTarget

export type HandingSlot = string | number

export interface ReadHanding {
  readonly receiver: ReadTarget
  readonly slot: HandingSlot
}

export interface WrittenAt {
  readonly slot: HandingSlot | null
  readonly keyPath: readonly string[]
  readonly isSpread: boolean
  readonly isBase: boolean
}

export interface ReadUse {
  readonly usedAt: SourceRange
  readonly use: SymbolUse
  readonly memberPath: readonly string[]
  readonly target: ReadTarget
  readonly handing: ReadHanding | null
  readonly writtenAt: WrittenAt
}

export const WRITTEN_NOWHERE: WrittenAt = { slot: null, keyPath: [], isSpread: false, isBase: false }

export interface ReadLocalExport {
  readonly exportedName: string
  readonly declarationRange: SourceRange
  readonly isFunction: boolean
}

export interface ReadForwardedExport {
  readonly exportedName: string
  readonly importedName: string
  readonly filePath: string | null
}

export interface FileExports {
  readonly local: readonly ReadLocalExport[]
  readonly forwarded: readonly ReadForwardedExport[]
}

export interface ScriptReading {
  readonly filePath: string
  readonly blocks: readonly ReadBlock[]
  readonly uses: readonly ReadUse[]
}

export interface FileReading extends ScriptReading {
  readonly readSyntax: (() => FileSyntax) | null
  readonly nodeAt?: (range: SourceRange) => SyntaxNode
}

export interface FoundExport {
  readonly filePath: string
  readonly declarationRange: SourceRange
  readonly isFunction: boolean
}

export type FindExport = (filePath: string, exportedName: string) => FoundExport | null

export interface OutlinedFile {
  readonly filePath: string
  readonly exports: FileExports
  readonly read: (findExport: FindExport, findBinding: FindExportedBinding, findHanded?: FindHandedExport) => FileReading
  readonly bindingAt?: (declarationRange: SourceRange, findBinding: FindExportedBinding) => Binding | null
  readonly handingsOf?: (filePath: string, moduleNames: readonly string[], findBinding: FindExportedBinding, findHanded: FindHandedExport) => HandedCallback[]
}

export const NO_EXPORTS: FileExports = { local: [], forwarded: [] }
