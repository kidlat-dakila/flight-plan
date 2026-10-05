import { buildDiagramTreeFromFile } from "./build-diagram-tree-from-file"
import { mergeDiagrams } from "./merge-diagrams"
import type { CallCandidates, LanguageTracer, SourceReader } from "./tracer/language"
import type { Diagram } from "./types"

export interface ChangedFile { path: string, changes: [number, number][] }

export interface BuildDiagramTreeInput<C extends SourceReader> {
  files: readonly ChangedFile[]
  tracer: LanguageTracer<C>
  repo: C
  candidates: CallCandidates
  values?: boolean
}

export async function buildDiagramTree<C extends SourceReader>({
  files,
  tracer,
  repo,
  candidates,
  values,
}: BuildDiagramTreeInput<C>): Promise<Diagram> {
  const perFile = await Promise.all(
    files.map(async (file) =>
      buildDiagramTreeFromFile({
        path: file.path,
        changes: file.changes,
        tracer,
        repo,
        candidates,
        values,
      }),
    ),
  )
  return mergeDiagrams(perFile)
}
