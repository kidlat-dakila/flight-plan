import type { ChangedFile } from "./build-diagram-tree"
import type { CallCandidates } from "./tracer/language"
import { languageForPath, type Language, type RepoBase } from "./tracer/languages"
import type { Diagram } from "./types"

export interface MultiLangInput {
  base: RepoBase
  files: readonly ChangedFile[]
  candidates: CallCandidates
  values?: boolean
}

export async function buildMultiLanguageDiagram({
  base,
  files,
  candidates,
  values,
}: MultiLangInput): Promise<Diagram> {
  const groups = files.reduce<ReadonlyMap<Language, readonly ChangedFile[]>>((held, file) => {
    const language = languageForPath(file.path)
    return language === null ? held : new Map(held).set(language, [...(held.get(language) ?? []), file])
  }, new Map())

  const forests = await Promise.all(
    [...groups].map(async ([language, group]) => language.buildDiagram({ base, files: group, candidates, values })),
  )

  return forests.flat()
}
