import type { SourceRange } from "./types"

export interface CodeId {
  readonly file: string
  readonly line: number
}

export interface CodeRef {
  readonly file: string
  readonly name: string
  readonly definedAt: SourceRange
  readonly enclosingRange: SourceRange
}

export type UsageKind = "call" | "value"

export interface DiagramNode {
  readonly id: CodeId
  readonly code: CodeRef
  readonly calledAt?: SourceRange
  readonly via?: UsageKind
  readonly callers: readonly DiagramNode[]
}
