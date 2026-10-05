import { buildDiagramTree, type ChangedFile } from "@/core/build-diagram-tree"
import type { LanguageParser } from "@/core/parsers/index"
import { pythonParser } from "@/core/parsers/python"
import { typescriptParser } from "@/core/parsers/typescript"
import type { Diagram } from "@/core/types"
import type { CallCandidates, LanguageTracer, SourceReader } from "./language"
import type { TreeCache } from "./parse"
import type { PyRepo } from "./python"
import { rootsFinder, pythonPackages } from "./python/module-roots"
import { pythonTracer } from "./python/tracer"
import type { Repo } from "./typescript"
import { parseCache } from "./typescript/estree"
import { graphResolver, repoGraph } from "./typescript/repo-graph"
import { moduleResolver } from "./typescript/resolve"
import { typescriptTracer } from "./typescript/tracer"

export interface RepoBase {
  files: ReadonlySet<string>
  read: (path: string) => Promise<string | null>
  readAll?: (paths: readonly string[]) => Promise<ReadonlyMap<string, string>>
  trees?: TreeCache
}

export interface LanguageDiagramInput {
  base: RepoBase
  files: readonly ChangedFile[]
  candidates: CallCandidates
  values?: boolean
}

export interface Language {
  id: string
  extensions: string[]
  stepParser: LanguageParser
  makeRepo: (base: RepoBase) => Promise<SourceReader>
  buildDiagram: (input: LanguageDiagramInput) => Promise<Diagram>
}

interface LanguageDefinition<C extends SourceReader> {
  id: string
  extensions: string[]
  tracer: LanguageTracer<C>
  stepParser: LanguageParser
  makeRepo: (base: RepoBase) => Promise<C>
}

const languageFrom = <C extends SourceReader>(definition: LanguageDefinition<C>): Language => ({
  id: definition.id,
  extensions: definition.extensions,
  stepParser: definition.stepParser,
  makeRepo: definition.makeRepo,
  buildDiagram: async ({ base, files, candidates, values }) =>
    buildDiagramTree({ files, tracer: definition.tracer, repo: await definition.makeRepo(base), candidates, values }),
})

const typescriptLanguage: LanguageDefinition<Repo> = {
  id: "typescript",
  extensions: typescriptTracer.extensions,
  tracer: typescriptTracer,
  stepParser: typescriptParser,
  makeRepo: async (base) => {
    const graph = await repoGraph(base)
    return { ...base, graph, resolve: graphResolver(graph, moduleResolver(base.files, base.read)), parsed: parseCache() }
  },
}

const pythonLanguage: LanguageDefinition<PyRepo> = {
  id: "python",
  extensions: pythonTracer.extensions,
  tracer: pythonTracer,
  stepParser: pythonParser,
  makeRepo: async (base) => ({
    ...base,
    rootsFor: rootsFinder(base.files, base.read),
    packages: await pythonPackages(base.files, base.read),
  }),
}

export const LANGUAGES: Language[] = [languageFrom(typescriptLanguage), languageFrom(pythonLanguage)]

export function languageForPath(filePath: string): Language | null {
  const dot = filePath.lastIndexOf(".")
  const ext = dot === -1 ? "" : filePath.slice(dot).toLowerCase()
  return LANGUAGES.find((language) => language.extensions.includes(ext)) ?? null
}

export function allExtensions(): string[] {
  return LANGUAGES.flatMap((language) => language.extensions)
}
