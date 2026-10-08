import type { z } from "zod"
import type { journeyFlowSchema } from "./artifact-schema"
import type { CHANGE_TYPES, CONNECTION_CERTAINTIES, CONNECTION_KINDS, ENTRY_POINT_TRIGGERS, NODE_CATEGORIES } from "./kinds"

export type ArtifactStatus = "drafting" | "complete"

export type LineMark = "context" | "added" | "removed"

export interface SourceLine {
  readonly text: string
  readonly mark: LineMark
  readonly number: number | null
}

export interface LineRange {
  readonly lineStart: number
  readonly lineEnd: number
}

export interface SourceFile {
  readonly path: string
  readonly language: string
  readonly lines: readonly SourceLine[]
  readonly declarations: Readonly<Record<string, LineRange>>
}

export type FindingKind = "bug" | "risk" | "nit" | "question"

export interface Finding {
  readonly id: string
  readonly kind: FindingKind
  readonly title: string
  readonly reading: string
  readonly trace: readonly string[] | null
  readonly solution: string | null
}

export interface Waypoint {
  readonly id: string
  readonly title: string | null
  readonly declaration: string
  readonly reading: string
  readonly needsAttention: string | null
  readonly findings: readonly Finding[]
  readonly children: readonly Waypoint[]
}

export interface FileSection {
  readonly path: string
  readonly title: string
  readonly summary: readonly string[]
  readonly waypoints: readonly Waypoint[]
}

export type NodeCategory = (typeof NODE_CATEGORIES)[number]

export type ConnectionKind = (typeof CONNECTION_KINDS)[number]

export type ConnectionCertainty = (typeof CONNECTION_CERTAINTIES)[number]

export type EntryPointTrigger = (typeof ENTRY_POINT_TRIGGERS)[number]

type DeepReadonly<Value> = Value extends (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : Value extends object
    ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
    : Value

export type ChangeType = (typeof CHANGE_TYPES)[number]

export type JourneyFlow = DeepReadonly<z.infer<typeof journeyFlowSchema>>

export type JourneyNode = JourneyFlow["nodes"][number]

export type EntryPointNode = Extract<JourneyNode, { readonly kind: "entry-point" }>

export type DeclarationNode = Extract<JourneyNode, { readonly kind: "declaration" }>

export type JourneyEdge = JourneyFlow["edges"][number]

export type TraceEnd = NonNullable<EntryPointNode["traceEnd"]>

export type TracedLine = DeclarationNode["tracedLines"][number]

export type TracedName = DeclarationNode["data"][number]

export type TracedEvent = DeclarationNode["events"][number]

export type ComponentReturn = DeclarationNode["returns"][number]

export type LineSpan = TracedName["reference"]

export type Verdict = "breaks" | "behaviour-changes" | "unaffected"

export interface Contract {
  readonly before: string | null
  readonly now: string
}

export interface BlastNode {
  readonly id: string
  readonly ring: number
  readonly path: string
  readonly declaration: string
  readonly label: string | null
  readonly contract: Contract | null
  readonly verdict: Verdict | null
  readonly effect: string | null
}

export interface BlastEdge {
  readonly from: string
  readonly to: string
  readonly kind: ConnectionKind
  readonly certainty: ConnectionCertainty
}

export interface Blast {
  readonly nodes: readonly BlastNode[]
  readonly edges: readonly BlastEdge[]
}

export interface CodeWalkthrough {
  readonly intro: string | null
  readonly files: readonly FileSection[]
}

export interface Segment {
  readonly id: string
  readonly title: string
  readonly changedPaths: readonly string[]
  readonly context: string
  readonly journey: JourneyFlow | null
  readonly blast: Blast | null
  readonly walkthrough: CodeWalkthrough
}

export interface ReviewArtifact {
  readonly title: string
  readonly status: ArtifactStatus
  readonly commit: string
  readonly isSegmented: boolean
  readonly segments: readonly Segment[]
  readonly sources: readonly SourceFile[]
  readonly changedPaths: readonly string[]
}
