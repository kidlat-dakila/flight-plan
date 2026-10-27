import type { CodeBlockClassification } from "@/code-blocks/types"

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
  readonly classifies?: CodeBlockClassification
  readonly pathAt?: SlotPosition
  readonly prefixAt?: SlotPosition
  readonly method?: string
  readonly methodAt?: SlotPosition
  readonly eventAt?: SlotPosition
  readonly provides?: ContextProvision
  readonly reads?: ContextRead
  readonly isOwnNode?: boolean
  readonly returnsAt?: SlotPosition
}

export interface DecoratorPattern {
  readonly kind: "decorator"
  readonly name: string
  readonly from?: string
  readonly versions?: string
  readonly runs?: SlotRuns
  readonly slots?: readonly Slot[]
  readonly makes?: BlockMade
  readonly classifies?: CodeBlockClassification
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
  readonly classifies?: CodeBlockClassification
  readonly pathAt?: SlotPosition
  readonly provides?: ContextProvision
  readonly reads?: ContextRead
}

export interface CalledValue {
  readonly slots: readonly Slot[]
  readonly makes?: BlockMade
  readonly classifies?: CodeBlockClassification
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
  readonly classifies?: CodeBlockClassification
  readonly prefixAt?: SlotPosition
  readonly provides?: ContextProvision
  readonly makesType?: string
  readonly parameterOfTypes?: readonly string[]
  readonly isTypeOnly?: boolean
}

export interface AssignmentPattern {
  readonly kind: "assignment"
  readonly name: string
  readonly slots: readonly Slot[]
  readonly from?: string
  readonly versions?: string
  readonly makes?: BlockMade
  readonly classifies?: CodeBlockClassification
}

export type MethodPattern = CallPattern | DecoratorPattern | ElementPattern | FactoryPattern | AssignmentPattern

export interface FileExport {
  readonly name: string
  readonly runs: SlotRuns
  readonly method?: string
  readonly classifies?: CodeBlockClassification
}

export interface FilePattern {
  readonly kind: "file"
  readonly glob: string
  readonly excludes?: readonly string[]
  readonly exports: readonly FileExport[]
  readonly versions?: string
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
  readonly classifies?: CodeBlockClassification
}

export interface ClassPattern {
  readonly kind: "class"
  readonly name: string
  readonly members: readonly ClassMember[]
  readonly methods: readonly MethodPattern[]
  readonly from?: string
  readonly versions?: string
  readonly makes?: BlockMade
  readonly classifies?: CodeBlockClassification
}

export type CataloguePattern = MethodPattern | ClassPattern | FilePattern | DirectivePattern

export type LocationHolds = "globs" | "paths" | "folders" | "names" | "files" | "file-folders" | "modules" | "url-globs" | "regex"

export type LocationBase = "config" | "package"

export interface ScriptFlag {
  readonly scripts: string
  readonly command: string
  readonly flags: readonly string[]
}

export interface ConfigFile {
  readonly glob: string
  readonly under?: string
  readonly base?: LocationBase
  readonly levelsUp?: number
  readonly namedBy?: ScriptFlag
}

export interface LocationKey {
  readonly key: string
  readonly holds: LocationHolds
  readonly below?: string
  readonly default?: readonly string[]
  readonly unlessRead?: string | readonly string[]
  readonly defaultWhen?: string
  readonly defaultBase?: LocationBase
  readonly separator?: string
  readonly isScope?: boolean
  readonly isBase?: boolean
}

export interface LocationSetting {
  readonly classification: CodeBlockClassification
  readonly files: readonly ConfigFile[]
  readonly keys: readonly LocationKey[]
  readonly marks?: "file" | "folder"
}

export interface CatalogueLibrary {
  readonly name: string
  readonly specifiers: readonly string[]
  readonly documentedVersion?: string
  readonly category: string
  readonly type: LibraryType
  readonly language: LibraryLanguage
  readonly patterns: readonly CataloguePattern[]
  readonly locations?: readonly LocationSetting[]
}

export interface PatternFixture {
  readonly library: string
  readonly patternKey: string
  readonly matches: readonly string[]
  readonly rejects: readonly string[]
}
