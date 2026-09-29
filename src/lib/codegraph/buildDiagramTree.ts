/**
 * The whole diagram for a set of changed files — the top-level entry.
 *
 * Runs {@link buildDiagramTreeFromFile} for each changed file over one shared
 * repo and candidate search, then {@link mergeDiagrams} joins the per-file
 * trees into one connected structure (deepest changes become roots, a changed
 * function that is also a caller is absorbed). This is the single call a caller
 * makes; the repo, candidate search and language tracer are injected, so the
 * git-backed wiring stays a thin adapter on top.
 */
import { buildDiagramTreeFromFile } from "./buildDiagramTreeFromFile"
import { mergeDiagrams } from "./mergeDiagrams"
import type { CallCandidates, LanguageTracer, SourceReader } from "./tracer/language"
import type { Diagram } from "./types"

/** One changed file and the lines the diff touched in it. */
export type ChangedFile = { path: string; changes: [number, number][] }

export type BuildDiagramTreeInput<C extends SourceReader> = {
  /** The changed files, each with its changed line ranges. */
  files: readonly ChangedFile[]
  /** The language tracer — declarations and the caller graph. */
  tracer: LanguageTracer<C>
  /** Where files (and the language's resolution) are read. */
  repo: C
  /** The candidate search: files that might call a declaration. */
  candidates: CallCandidates
  /**
   * Follow the change as a value (hooks, JSX props, collections, returns, and
   * escape markers), not only as a call. The diagram sets this; the blast radius
   * leaves it off. See {@link BuildDiagramTreeFromFileInput.values}.
   */
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
    files.map((file) =>
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
