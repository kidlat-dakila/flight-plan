/**
 * The multi-language orchestrator: one changed set, dispatched per language.
 *
 * A review can touch more than one language at once (a TypeScript frontend and
 * a Python service in the same commit). This groups the changed files by the
 * {@link languageForPath} that claims each one, builds that language's repo once
 * via its `makeRepo`, and runs {@link buildDiagramTree} per group — each language
 * tracing and merging only within itself. The forests are concatenated, not
 * merged across languages: there is no cross-language call tracing, so a
 * TypeScript root's callers stay TypeScript and a Python root's callers stay
 * Python. A file no registered language claims is dropped.
 */
import { buildDiagramTree, type ChangedFile } from "./buildDiagramTree"
import type { CallCandidates } from "./tracer/language"
import { languageForPath, type Language, type RepoBase } from "./tracer/languages"
import type { Diagram } from "./types"

export type MultiLangInput = {
  /** The file set and reader every language's repo starts from. */
  base: RepoBase
  /** The changed files, each with its changed line ranges. */
  files: readonly ChangedFile[]
  /** The candidate search: files that might call a declaration. */
  candidates: CallCandidates
  /** Follow the change as a value, not only as a call. See {@link BuildDiagramTreeInput.values}. */
  values?: boolean
}

export async function buildMultiLanguageDiagram({
  base,
  files,
  candidates,
  values,
}: MultiLangInput): Promise<Diagram> {
  const groups = new Map<Language, ChangedFile[]>()
  for (const file of files) {
    const language = languageForPath(file.path)
    if (language === null) continue
    const group = groups.get(language) ?? []
    group.push(file)
    groups.set(language, group)
  }

  const forests = await Promise.all(
    [...groups].map(async ([language, group]) => {
      const repo = await language.makeRepo(base)
      return buildDiagramTree({ files: group, tracer: language.tracer, repo, candidates, values })
    }),
  )

  return forests.flat()
}
