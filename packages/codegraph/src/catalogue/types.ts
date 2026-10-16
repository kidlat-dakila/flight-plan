export type SlotRuns
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

export type BlockMade
  = | "state"
    | "derived"
    | "data"
    | "data-fetch"
    | "cache"
    | "auth"
    | "request"
    | "navigation"
    | "publish"
    | "validation"
    | "config"
    | "feature-flag"
    | "storage"
    | "telemetry"
    | "transaction"

export type SlotPlace = number | string

export type SlotPosition = SlotPlace | readonly SlotPlace[]

export type LibraryType = "frontend" | "backend" | "fullstack"

export type LibraryLanguage = "javascript" | "python"

export interface Slot {
  readonly at: SlotPosition
  readonly runs: SlotRuns
  readonly holdsActions?: boolean
}

export interface ContextProvision {
  readonly keyAt?: SlotPosition
  readonly valueAt: SlotPosition
}

export interface ContextRead {
  readonly keyAt?: SlotPosition
}

export interface CallPattern {
  readonly kind: "call"
  readonly name: string
  readonly slots: readonly Slot[]
  readonly from?: string
  readonly versions?: string
  readonly makes?: BlockMade
  readonly pathAt?: SlotPosition
  readonly prefixAt?: SlotPosition
  readonly method?: string
  readonly methodAt?: SlotPosition
  readonly eventAt?: SlotPosition
  readonly provides?: ContextProvision
  readonly reads?: ContextRead
  readonly isOwnNode?: boolean
}

export interface DecoratorPattern {
  readonly kind: "decorator"
  readonly name: string
  readonly from?: string
  readonly versions?: string
  readonly runs?: SlotRuns
  readonly slots?: readonly Slot[]
  readonly makes?: BlockMade
  readonly pathAt?: SlotPosition
  readonly prefixAt?: SlotPosition
  readonly method?: string
  readonly methodAt?: SlotPosition
  readonly eventAt?: SlotPosition
}

export interface ElementPattern {
  readonly kind: "element"
  readonly name: string
  readonly slots: readonly Slot[]
  readonly from?: string
  readonly versions?: string
  readonly makes?: BlockMade
  readonly pathAt?: SlotPosition
  readonly provides?: ContextProvision
  readonly reads?: ContextRead
}

export interface CalledValue {
  readonly slots: readonly Slot[]
  readonly makes?: BlockMade
  readonly methods?: readonly MethodPattern[]
}

export interface FactoryPattern {
  readonly kind: "factory"
  readonly name: string
  readonly methods: readonly MethodPattern[]
  readonly slots?: readonly Slot[]
  readonly called?: CalledValue
  readonly from?: string
  readonly versions?: string
  readonly makes?: BlockMade
  readonly prefixAt?: SlotPosition
  readonly provides?: ContextProvision
  readonly makesType?: string
  readonly parameterOfTypes?: readonly string[]
}

export type MethodPattern = CallPattern | DecoratorPattern | ElementPattern | FactoryPattern

export interface FileExport {
  readonly name: string
  readonly runs: SlotRuns
  readonly method?: string
}

export interface FilePattern {
  readonly kind: "file"
  readonly glob: string
  readonly exports: readonly FileExport[]
  readonly versions?: string
  readonly isIgnored?: boolean
}

export interface DirectivePattern {
  readonly kind: "directive"
  readonly text: string
  readonly runs: SlotRuns
  readonly method?: string
  readonly versions?: string
}

export interface ClassMember {
  readonly name: string
  readonly runs: SlotRuns
  readonly method?: string
}

export interface ClassPattern {
  readonly kind: "class"
  readonly name: string
  readonly members: readonly ClassMember[]
  readonly methods: readonly MethodPattern[]
  readonly from?: string
  readonly versions?: string
  readonly makes?: BlockMade
}

export type CataloguePattern = MethodPattern | ClassPattern | FilePattern | DirectivePattern

export interface CatalogueLibrary {
  readonly name: string
  readonly specifiers: readonly string[]
  readonly documentedVersion?: string
  readonly category: string
  readonly type: LibraryType
  readonly language: LibraryLanguage
  readonly patterns: readonly CataloguePattern[]
}

export interface PatternFixture {
  readonly library: string
  readonly patternKey: string
  readonly matches: readonly string[]
  readonly rejects: readonly string[]
}
