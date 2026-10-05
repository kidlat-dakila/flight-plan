export interface Position {
  readonly line: number
  readonly column: number
}

export interface SourceRange {
  readonly start: Position
  readonly end: Position
}

export type LineRange = readonly [startLine: number, endLine: number]

export type EncapsulationKind = "function" | "class" | "method" | "variable"

export interface Encapsulation {
  readonly name: string
  readonly kind: EncapsulationKind
  readonly range: SourceRange
  readonly encapsulations: readonly Encapsulation[]
}

export type SymbolSpace = "value" | "type"

export interface Declaration {
  readonly name: string
  readonly range: SourceRange
  readonly scope: SourceRange
  readonly spaces: readonly SymbolSpace[]
}

export type DeclarationType = "argument" | "inline-declaration" | "anonymous"

export type VariableType = "primitive" | "type" | "class" | "function"

export interface FileVariable extends Declaration {
  readonly declarationType: DeclarationType
  readonly type: VariableType
}

export interface ImportVariable extends Declaration {
  readonly importedName: string
  readonly specifier: string
  readonly importedFilePath: string | null
}

export interface SymbolReference {
  readonly name: string
  readonly range: SourceRange
  readonly spaces: readonly SymbolSpace[]
}

export interface SymbolTarget {
  readonly name: string
  readonly range: SourceRange
}

export interface Usage {
  readonly range: SourceRange
  readonly encapsulation: Encapsulation | null
  readonly rootEncapsulation: Encapsulation | null
}

export interface ImportedSymbol {
  readonly filePath: string
  readonly name: string
}
