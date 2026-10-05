import type { CodeRef, DiagramNode } from "@/core/types"
import type { CallGraph } from "./caller-tree"

export interface SourceReader { read: (path: string) => Promise<string | null> }

export type CallCandidates = (target: CodeRef) => Promise<string[]>

export interface LanguageTracer<C extends SourceReader = SourceReader> {
  extensions: string[]
  declarationsOf: (repo: C, file: string) => Promise<CodeRef[]>
  callGraph: (repo: C, candidates: CallCandidates) => CallGraph
  reach?: (repo: C, candidates: CallCandidates, root: CodeRef) => Promise<DiagramNode>
}
