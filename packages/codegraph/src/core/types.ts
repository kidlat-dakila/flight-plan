export interface Pos { line: number, column: number }

export interface Range { start: Pos, end: Pos }

export type Diagram = DiagramNode[]

export interface CodeId { file: string, line: number }

export interface CodeRef {
  file: string
  name: string
  definedAt: Range
  enclosingRange: Range
}

export interface DiagramNode {
  id: CodeId
  code: CodeRef
  calledAt?: Range

  via?: "call" | "value"

  escape?: { reason: EscapeKind, at: Range }

  callers: DiagramNode[]

  callees?: DiagramNode[]

  children?: DiagramNode[]

  executionSteps?: ExecutionStep[]
}

export type EscapeKind
  = | "spread"
    | "props"
    | "store"
    | "event-bus"
    | "dynamic-dispatch"
    | "hoc"
    | "library"
    | "decorator"
    | "import"

export type StepType
  = | "declaration"
    | "expression"
    | "conditional"
    | "loop"
    | "try"
    | "return"
    | "throw"
    | "jump"
    | "block"
    | "comment"
    | "other"

export interface ExecutionStep {
  line: number
  text: string
  range: Range
  type: StepType
  changed: boolean
  branches?: { label: string, steps: ExecutionStep[] }[]
}
