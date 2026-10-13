import { BLOCK_TYPE_LABELS } from "@flightplan/codegraph"
import type { CodeBlockType } from "@flightplan/configurations"

export interface RowKindOption {
  readonly value: CodeBlockType
  readonly label: string
}

export const DEFAULT_ROW_KIND: CodeBlockType = "call"

const ROW_KINDS: readonly CodeBlockType[] = [
  "root-argument-value",
  "state",
  "derived",
  "external-value",
  "variable",
  "property",
  "effect",
  "effect-callback",
  "render-event",
  "code-event",
  "data-fetch",
  "call",
  "function",
  "method",
  "condition",
  "switch",
  "loop",
  "try-catch",
  "throw",
  "data",
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
]

const KIND_LABELS: Readonly<Partial<Record<CodeBlockType, string>>> = {
  "render-event": "User event",
  "code-event": "Code event",
  "component-effect": "Component effect",
  "render": "Markup element",
  "render-root": "Markup",
}

export const labelOfRowKind = (kind: CodeBlockType): string => KIND_LABELS[kind] ?? BLOCK_TYPE_LABELS[kind]

export const listRowKindOptions = (heldKinds: readonly CodeBlockType[]): RowKindOption[] =>
  [...new Set([...ROW_KINDS, ...heldKinds])].map((kind) => ({ value: kind, label: labelOfRowKind(kind) }))
