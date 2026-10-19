import type { z } from "zod"
import type { ASTCodeGroupGraph, CodeBlock, CodeBlockType } from "@/code-graph/code-blocks"
import type { ImportGraphGroup } from "@/code-graph/import-graph"
import type { codeExportSchema, codeReferenceSchema, codeUsageSchema, languageReferenceSchema } from "./artifact-schema"
import type { CARD_SIDES, CONTEXT_CODE_BLOCK_KINDS, DIFF_TYPES, IMPACT_TYPES, SECTION_NAMES } from "./kinds"

export type ArtifactStatus = "drafting" | "authoring" | "complete"

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

export type LineSpan = readonly [number, number]

export interface CodeSpan {
  readonly line: number
  readonly startColumn: number
  readonly endColumn: number
}

export type CodeReference = Readonly<z.infer<typeof codeReferenceSchema>>

export type LanguageReference = Readonly<z.infer<typeof languageReferenceSchema>>

export type CodeUsage = Readonly<z.infer<typeof codeUsageSchema>>

export type CodeExport = Readonly<z.infer<typeof codeExportSchema>>

export interface SourceFile {
  readonly path: string
  readonly language: string
  readonly lines: readonly SourceLine[]
  readonly declarations: Readonly<Record<string, LineRange>>
  readonly references: readonly CodeReference[]
  readonly languageReferences: readonly LanguageReference[]
  readonly exports: readonly CodeExport[]
}

export type ContextCodeBlockKind = (typeof CONTEXT_CODE_BLOCK_KINDS)[number]

export interface ContextCodeBlock {
  readonly isRequired: boolean
  readonly kind: ContextCodeBlockKind
  readonly codeBlock: CodeBlock | null
  readonly specifier: string | null
  readonly name: string | null
  readonly description: string | null
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
  readonly codeBlocks: readonly CodeBlock[]
  readonly reading: string
  readonly coreChange: string | null
  readonly findings: readonly Finding[]
  readonly children: readonly Waypoint[]
  readonly isRequired: boolean
}

export interface FileSection {
  readonly path: string
  readonly waypoints: readonly Waypoint[]
}

export interface TriggerLabel {
  readonly label: string | null
  readonly codeBlock: CodeBlock
}

export interface BlockLabel {
  readonly label: string | null
  readonly codeBlock: CodeBlock
}

export interface TraceRow {
  readonly id: string
  readonly type: CodeBlockType
  readonly label: string | null
  readonly lineStart: number
  readonly lineEnd: number
}

export interface CardPosition {
  readonly x: number
  readonly y: number
}

export type CardSide = (typeof CARD_SIDES)[number]

export interface TraceNode {
  readonly id: string
  readonly type: CodeBlockType
  readonly label: string | null
  readonly description: string | null
  readonly codeBlocks: readonly CodeBlock[]
  readonly diffCodeBlocks: readonly CodeBlock[]
  readonly children: readonly TraceNode[]
  readonly triggerLabels: readonly TriggerLabel[]
  readonly blockLabels: readonly BlockLabel[]
  readonly rows?: readonly TraceRow[] | undefined
  readonly position?: CardPosition | undefined
  readonly isRequired: boolean
}

export interface TraceNodeEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly fromRowId?: string | undefined
  readonly toSide?: CardSide | undefined
}

export interface TraceDiagram {
  readonly astCodeGroup: ASTCodeGroupGraph
  readonly importGraphGroup: ImportGraphGroup
  readonly description: string | null
  readonly traceNodes: readonly TraceNode[]
  readonly traceNodeEdges: readonly TraceNodeEdge[]
  readonly isRequired: boolean
}

export type DiffType = (typeof DIFF_TYPES)[number]

export type ImpactType = (typeof IMPACT_TYPES)[number]

export interface BlastNode {
  readonly path: string
  readonly diffType: DiffType | null
  readonly impactType: ImpactType | null
  readonly impactReason: string | null
  readonly isRequired: boolean
}

export interface BlastEdge {
  readonly importer: string
  readonly imported: string
}

export interface ImportBoundNode {
  readonly path: string
  readonly diffType: DiffType | null
}

export interface ImportBound {
  readonly nodes: readonly ImportBoundNode[]
  readonly edges: readonly BlastEdge[]
}

export interface Blast {
  readonly nodes: readonly BlastNode[]
  readonly edges: readonly BlastEdge[]
  readonly importBound?: ImportBound
}

export interface CodeWalkthrough {
  readonly files: readonly FileSection[]
}

export interface Segment {
  readonly id: string
  readonly title: string
  readonly changedPaths: readonly string[]
  readonly context: string
  readonly traceDiagram: TraceDiagram | null
  readonly blastDiagram: Blast | null
  readonly walkthrough: CodeWalkthrough
  readonly isContextRequired: boolean
}

export type SectionName = (typeof SECTION_NAMES)[number]

export type SectionSwitches = Readonly<Record<SectionName, boolean>>

export interface ReviewArtifact {
  readonly title: string
  readonly status: ArtifactStatus
  readonly sections?: SectionSwitches | undefined
  readonly commit: string
  readonly isSegmented: boolean
  readonly segments: readonly Segment[]
  readonly sources: readonly SourceFile[]
  readonly contextCodeBlocks: readonly ContextCodeBlock[]
  readonly changedPaths: readonly string[]
}
