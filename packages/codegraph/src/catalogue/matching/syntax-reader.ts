import type { SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import type { LibraryLanguage } from "@/catalogue/types"

export interface ImportBinding {
  readonly kind: "import"
  readonly specifier: string
  readonly importedName: string
}

export interface ValueBinding {
  readonly kind: "value"
  readonly value: SyntaxNode
  readonly memberPath: readonly string[]
  readonly reader?: SyntaxReader
}

export interface ClassBinding {
  readonly kind: "class"
  readonly declaration: SyntaxNode
  readonly reader?: SyntaxReader
}

export interface ParameterBinding {
  readonly kind: "parameter"
  readonly holder: SyntaxNode
}

export type Binding = ImportBinding | ValueBinding | ClassBinding | ParameterBinding

export interface NameExpression {
  readonly kind: "name"
  readonly name: SyntaxNode
}

export interface MemberExpression {
  readonly kind: "member"
  readonly object: SyntaxNode
  readonly property: string
}

export interface CallExpression {
  readonly kind: "call"
  readonly callee: SyntaxNode
}

export interface WrappedExpression {
  readonly kind: "wrapped"
  readonly inner: SyntaxNode
}

export interface OtherExpression {
  readonly kind: "other"
}

export type Expression = NameExpression | MemberExpression | CallExpression | WrappedExpression | OtherExpression

export interface PassedValue {
  readonly position: number | null
  readonly name: string | null
  readonly node: SyntaxNode
}

export interface CallSite {
  readonly kind: "call"
  readonly node: SyntaxNode
  readonly callee: SyntaxNode
}

export interface DecoratorSite {
  readonly kind: "decorator"
  readonly node: SyntaxNode
  readonly callee: SyntaxNode
}

export interface ElementSite {
  readonly kind: "element"
  readonly node: SyntaxNode
  readonly callee: SyntaxNode
}

export interface ClassSite {
  readonly kind: "class"
  readonly node: SyntaxNode
  readonly bases: readonly SyntaxNode[]
}

export type Site = CallSite | DecoratorSite | ElementSite | ClassSite

export interface Directive {
  readonly text: string
  readonly node: SyntaxNode
}

export interface SyntaxReader {
  readonly language: LibraryLanguage
  readonly tree: SyntaxTree
  readonly expressionOf: (node: SyntaxNode) => Expression
  readonly bindingOf: (name: SyntaxNode) => Binding | null
  readonly basesOf: (declaration: SyntaxNode) => readonly SyntaxNode[]
  readonly callHandedTo: (callback: SyntaxNode) => SyntaxNode | null
  readonly listSites: () => readonly Site[]
  readonly listDirectives: () => readonly Directive[]
  readonly passedTo: (site: SyntaxNode) => readonly PassedValue[]
  readonly propertiesOf: (value: SyntaxNode) => readonly PassedValue[] | null
  readonly itemsOf: (value: SyntaxNode) => readonly SyntaxNode[] | null
  readonly textOf: (value: SyntaxNode) => string | null
  readonly isFunction: (value: SyntaxNode) => boolean
}

export type FindExportedBinding = (filePath: string, exportedName: string) => Binding | null

export const NO_EXPRESSION: OtherExpression = { kind: "other" }
