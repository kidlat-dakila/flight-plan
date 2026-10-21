export interface Position {
  readonly line: number
  readonly column: number
}

export interface SourceRange {
  readonly start: Position
  readonly end: Position
}

export const CODE_BLOCK_TYPES = [
  "function",
  "method",
  "hook",
  "component",
  "class",
  "root-variable",
  "root-statement",
  "type-declaration",
  "import",
  "directive",
  "file",
  "condition",
  "switch",
  "switch-case",
  "loop",
  "try-catch",
  "throw",
  "call",
  "effect",
  "component-effect",
  "effect-callback",
  "code-event",
  "route",
  "resolver",
  "middleware",
  "render",
  "render-condition",
  "render-loop",
  "render-event",
  "render-root",
  "state",
  "derived",
  "data",
  "data-fetch",
  "cache",
  "auth",
  "request",
  "navigation",
  "publish",
  "validation",
  "config",
  "feature-flag",
  "storage",
  "telemetry",
  "transaction",
  "external-value",
  "root-argument-value",
  "variable",
  "property",
  "deleted",
] as const

export type CodeBlockType = (typeof CODE_BLOCK_TYPES)[number]

export const CODE_BLOCK_CLASSIFICATIONS = [
  "test",
  "build-and-infrastructure",
  "migration",
  "page",
  "component",
  "webhook",
  "server-action",
  "api-route",
  "websocket",
  "messaging",
  "job",
  "cli-command",
  "database-read-write",
  "data-model",
  "third-party-integration",
  "api-request",
  "validation",
  "ui-state",
  "hook",
  "security",
  "file-io",
  "process-execution",
  "navigation",
  "error-handling",
  "effect",
  "event",
  "app-setup",
  "feature-flag",
  "config",
  "storage",
  "telemetry",
  "i18n",
  "styling",
  "file",
  "logic",
] as const

export type CodeBlockClassification = (typeof CODE_BLOCK_CLASSIFICATIONS)[number]

export const primaryClassificationOf = (classifications: readonly CodeBlockClassification[]): CodeBlockClassification | null =>
  classifications.length === 0 ? null : classifications[0]

export type DiffKind
  = | "ui"
    | "state"
    | "effect"
    | "event"
    | "route"
    | "data"
    | "security"
    | "type"
    | "file"
    | "logic"

export type CatalogueRuns
  = | "route"
    | "resolver"
    | "page"
    | "middleware"
    | "job"
    | "command"
    | "event"
    | "effect"
    | "in-place"
    | "kept"

export type CatalogueCertainty = "proven" | "assumed"

export interface CodeBlockCatalogue {
  readonly specifier: string | null
  readonly name: string
  readonly runs: CatalogueRuns | null
  readonly path: string | null
  readonly method: string | null
  readonly event: string | null
  readonly certainty: CatalogueCertainty
  readonly isOwnNode?: boolean
  readonly classifies?: CodeBlockClassification
}

export type CardKind = "route" | "router" | "store" | "api"

export type CardPart
  = | "holder"
    | "state"
    | "getter"
    | "action"
    | "selector"
    | "reducer"
    | "thunk"
    | "extra-reducer"
    | "listener"
    | "case"
    | "handler"
    | "middleware"
    | "mount"
    | "versioning"
    | "server-action"
    | "page"
    | "procedure"
    | "endpoint"
    | "controller"

export interface RoutePattern {
  readonly pathPattern: string
  readonly method: string | null
}

export interface BlockCard {
  readonly library: string
  readonly kind: CardKind
  readonly part: CardPart
  readonly heading: string | null
  readonly groupKey: string | null
  readonly ownerId: string | null
  readonly routePaths?: readonly string[]
  readonly isAppWide?: boolean
  readonly isAppMount?: boolean
  readonly mountedModule?: string
  readonly routePatterns?: readonly RoutePattern[]
  readonly excludedRoutePatterns?: readonly RoutePattern[]
  readonly versions?: readonly string[]
}

export type SymbolUse = "call" | "render" | "value" | "read" | "type"

export interface SymbolMember {
  readonly path: readonly string[]
  readonly block: CodeBlock | null
}

export interface SymbolUsage {
  readonly usedAt: SourceRange
  readonly use: SymbolUse
  readonly handedTo?: CodeBlock | null
  readonly member?: SymbolMember
  readonly binding?: string
}

export interface InternalVariableSymbol extends SymbolUsage {
  readonly type: "internal-variable"
  readonly lineOfCodeReference: SourceRange
}

export interface InternalCodeBlockSymbol extends SymbolUsage {
  readonly type: "internal-code-block"
  readonly codeBlockReference: CodeBlock
}

export interface ExternalVariableSymbol extends SymbolUsage {
  readonly type: "external-variable"
  readonly lineOfCodeReference: SourceRange
  readonly astGraph: ASTGraph
}

export interface ExternalBlockSymbol extends SymbolUsage {
  readonly type: "external-block"
  readonly codeBlockReference: CodeBlock
}

export interface UnopenedImportSymbol extends SymbolUsage {
  readonly type: "unopened-import"
  readonly specifier: string
  readonly importedName: string
  readonly isLibrary: boolean
}

export type CodeBlockSymbol
  = | InternalVariableSymbol
    | InternalCodeBlockSymbol
    | ExternalVariableSymbol
    | ExternalBlockSymbol
    | UnopenedImportSymbol

export type CodeBlockDiffType = "added" | "modified" | "deleted" | "affected"

export interface CodeBlockDiff {
  readonly type: CodeBlockDiffType
  readonly range: SourceRange
}

export interface CodeBlock {
  readonly id: string
  readonly name?: string
  readonly type: CodeBlockType
  readonly deletedType?: CodeBlockType
  readonly lineOfCodeRangeReference: readonly SourceRange[]
  readonly parentBlock: CodeBlock | null
  readonly childrenBlocks: readonly CodeBlock[]
  readonly isRoot: boolean
  readonly isExported: boolean
  readonly isPlain?: boolean
  readonly isReturned?: boolean
  readonly isParameterProperty?: boolean
  readonly isAnnotatedAlias?: boolean
  readonly exportedBy: readonly ASTGraph[]
  readonly lineOfCodeDiffs: readonly SourceRange[] | null
  readonly diffs: readonly CodeBlockDiff[]
  readonly diffSources: readonly CodeBlock[]
  readonly classifications: readonly CodeBlockClassification[]
  readonly diffClassifications: readonly CodeBlockClassification[]
  readonly outerSymbols: readonly CodeBlockSymbol[]
  readonly usedBy: readonly CodeBlock[]
  readonly nextBlocks: readonly CodeBlock[]
  readonly handedFrom: readonly CodeBlockSymbol[]
  readonly astGraph: ASTGraph
  readonly catalogue: CodeBlockCatalogue | null
  readonly card?: BlockCard
  readonly cardOwner?: CodeBlock | null
}

export interface ASTGraph {
  readonly filePath: string
  readonly codeBlocks: readonly CodeBlock[]
  readonly rootBlocks: readonly CodeBlock[]
  readonly diffBlocks: readonly CodeBlock[]
  readonly diffContains: readonly DiffKind[]
  readonly renderRootBlocks?: readonly CodeBlock[]
  readonly externalSymbols: readonly CodeBlockSymbol[]
  readonly externalBlocks: readonly CodeBlock[]
  readonly exports: ReadonlyMap<string, CodeBlock | SourceRange>
}

export interface ASTCodeGroupGraph {
  readonly astGraphs: readonly ASTGraph[]
  readonly rootASTGraphs: readonly ASTGraph[]
  readonly codeBlocks: readonly CodeBlock[]
  readonly diffBlocks: readonly CodeBlock[]
  readonly diffContains: readonly DiffKind[]
  readonly chainContains: readonly DiffKind[]
  readonly diffChains: readonly CodeBlock[]
}
