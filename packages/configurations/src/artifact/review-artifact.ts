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

export type NodeCategory = "guard" | "logic" | "data" | "type" | "ui" | "event" | "config"

export type ConnectionKind = "call" | "value" | "data"

export type ConnectionCertainty = "proven" | "assumed"

export type EntryPointTrigger = "page-visit" | "user-action" | "api-call" | "command" | "boundary" | "app-start" | "unused"

export interface TracedLine {
  readonly line: number
  readonly text: string
  readonly isChanged: boolean
}

export type LineSpan = readonly [startLine: number, endLine: number]

export type ChangeType = "diff" | "related" | "none"

export interface TracedName {
  readonly name: string
  readonly changeType: ChangeType
  readonly reference: LineSpan
}

export interface TracedEvent extends TracedName {
  readonly nodeId: string | null
}

export interface TraceEnd {
  readonly path: string
  readonly line: number
  readonly text: string
  readonly event: string | null
  readonly element: string | null
  readonly library: string | null
}

export interface EntryPointNode {
  readonly kind: "entry-point"
  readonly id: string
  readonly trigger: EntryPointTrigger
  readonly label: string
  readonly description: string | null
  readonly traceEnd: TraceEnd | null
}

export interface DeclarationNode {
  readonly kind: "declaration"
  readonly id: string
  readonly path: string
  readonly declaration: string
  readonly changeType: ChangeType
  readonly isAdded: boolean
  readonly category: NodeCategory
  readonly label: string | null
  readonly description: string | null
  readonly tracedLines: readonly TracedLine[]
  readonly events: readonly TracedEvent[]
  readonly data: readonly TracedName[]
}

export type JourneyNode = EntryPointNode | DeclarationNode

export interface JourneyEdge {
  readonly from: string
  readonly to: string
  readonly kind: ConnectionKind | "trigger"
  readonly certainty: ConnectionCertainty
  readonly through: readonly string[]
  readonly condition: string | null
}

export interface JourneyFlow {
  readonly id: string
  readonly title: string
  readonly nodes: readonly JourneyNode[]
  readonly edges: readonly JourneyEdge[]
}

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
  readonly journeyAbsence: string | null
  readonly blast: Blast | null
  readonly blastAbsence: string | null
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
