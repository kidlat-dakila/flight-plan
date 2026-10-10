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

export interface DiffLocation {
  readonly diffLoC: LineRange
  readonly rootEncapsulation: Encapsulation
  readonly parentEncapsulation: Encapsulation
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

export interface ExportAlias {
  readonly name: string
  readonly exportedName: string
}

export interface ReExport {
  readonly importedName: string
  readonly exportedName: string
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

export interface AttributeSite {
  readonly kind: "attribute"
  readonly range: SourceRange
  readonly element: string
  readonly elementName: SymbolTarget | null
  readonly attribute: string
  readonly event?: string
  readonly isBuiltIn: boolean
  readonly text: string | null
}

export interface ArgumentSite {
  readonly kind: "argument"
  readonly range: SourceRange
  readonly callee: string
  readonly literal: string | null
  readonly results: readonly SymbolTarget[]
}

export interface CalleeSite {
  readonly kind: "callee"
  readonly range: SourceRange
}

export interface ElementSite {
  readonly kind: "element"
  readonly range: SourceRange
}

export interface MarkupSite {
  readonly kind: "markup"
  readonly range: SourceRange
}

export interface MemberSite {
  readonly kind: "member"
  readonly range: SourceRange
  readonly object: SourceRange
  readonly property: string
}

export interface PropertyBinding {
  readonly property: string
  readonly binding: SymbolTarget
}

export interface FirstParameter {
  readonly name: SymbolTarget | null
  readonly properties: readonly PropertyBinding[]
}

export interface FunctionSite {
  readonly kind: "function"
  readonly range: SourceRange
  readonly wrapped: SourceRange | null
  readonly firstParameter: FirstParameter | null
}

export interface KeptSite {
  readonly kind: "kept"
  readonly range: SourceRange
  readonly name: SymbolTarget | null
  readonly properties: readonly PropertyBinding[]
}

export interface PageSite {
  readonly kind: "page"
  readonly range: SourceRange
  readonly path: string
}

export type SyntaxSite
  = | AttributeSite
    | ArgumentSite
    | CalleeSite
    | ElementSite
    | MarkupSite
    | MemberSite
    | FunctionSite
    | KeptSite
    | PageSite

export type StatementType
  = | "import"
    | "type"
    | "declaration"
    | "expression"
    | "conditional"
    | "loop"
    | "try"
    | "return"
    | "throw"
    | "jump"
    | "markup"

export type ArmRole = "then" | "else" | "each" | "body" | "case" | "try" | "catch" | "finally"

export interface StatementArm {
  readonly role: ArmRole
  readonly label: string
  readonly subject: string | null
  readonly range: SourceRange
  readonly arms: readonly StatementArm[]
  readonly statements: readonly Statement[]
}

export interface Statement {
  readonly type: StatementType
  readonly text: string
  readonly range: SourceRange
  readonly arms: readonly StatementArm[]
  readonly statements: readonly Statement[]
}

export interface FileSyntax {
  readonly sourceLines: readonly string[]
  readonly rootEncapsulations: readonly Encapsulation[]
  readonly fileVariables: readonly FileVariable[]
  readonly importVariables: readonly ImportVariable[]
  readonly references: readonly SymbolReference[]
  readonly exportAliases: readonly ExportAlias[]
  readonly reExports: readonly ReExport[]
  readonly syntaxSites: readonly SyntaxSite[]
  readonly statements: readonly Statement[]
}
