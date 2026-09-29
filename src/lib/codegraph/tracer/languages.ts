/**
 * The language registry.
 *
 * Bundles each language's {@link LanguageTracer}, {@link LanguageParser}, and
 * repo-config builder in one place, and dispatches by file extension — the
 * tracer analogue of `parsers/index.ts`'s `parserForPath`. A mixed-language
 * review (Task 13) picks a `Language` per changed file and never names a
 * grammar itself.
 */
import type { LanguageTracer, SourceReader } from "./language"
import type { LanguageParser } from "../parsers/index"
import { typescriptParser } from "../parsers/typescript"
import { pythonParser } from "../parsers/python"
import { typescriptTracer } from "./typescript/tracer"
import { parseCache } from "./typescript/estree"
import { graphResolver, repoGraph } from "./typescript/repoGraph"
import { moduleResolver } from "./typescript/resolve"
import type { Repo } from "./typescript/index"
import { pythonTracer } from "./python/tracer"
import { rootsFinder, pythonPackages } from "./python/moduleRoots"
import type { PyRepo } from "./python/index"
import type { TreeCache } from "./parse"

/** What every language's `makeRepo` starts from: the file set and a reader. */
export type RepoBase = {
  files: ReadonlySet<string>
  read: (path: string) => Promise<string | null>
  /** Many files at once, where the source can batch it; each file as `read` would give it. */
  readAll?: (paths: readonly string[]) => Promise<ReadonlyMap<string, string>>
  /** One walk's parsed trees, shared by every resolver; each resolver keeps its own without it. */
  trees?: TreeCache
}

/** One language's tracer, step parser, and repo-config builder, bundled. */
export type Language<C extends SourceReader = SourceReader> = {
  /** A stable id, e.g. `"typescript"`. */
  id: string
  /** File extensions this language handles, lowercase with the dot. */
  extensions: string[]
  tracer: LanguageTracer<C>
  stepParser: LanguageParser
  /** Builds this language's repo shape from the shared file set and reader. */
  makeRepo: (base: RepoBase) => Promise<C>
}

const typescriptLanguage: Language<Repo> = {
  id: "typescript",
  extensions: typescriptTracer.extensions,
  tracer: typescriptTracer,
  stepParser: typescriptParser,
  makeRepo: async (base) => {
    const graph = await repoGraph(base)
    return { ...base, graph, resolve: graphResolver(graph, moduleResolver(base.files, base.read)), parsed: parseCache() }
  },
}

const pythonLanguage: Language<PyRepo> = {
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

/**
 * Every registered language. Each entry is concretely `Language<Repo>` or
 * `Language<PyRepo>`; the array erases that to `Language` (its `SourceReader`
 * floor) so the registry can hold a heterogeneous set. Consumers re-narrow by
 * matching on the extension that dispatched them here.
 */
export const LANGUAGES: Language[] = [
  typescriptLanguage as unknown as Language,
  pythonLanguage as unknown as Language,
]

/** The language for a file, chosen by its extension, or null when none handles it. */
export function languageForPath(filePath: string): Language | null {
  const dot = filePath.lastIndexOf(".")
  const ext = dot === -1 ? "" : filePath.slice(dot).toLowerCase()
  return LANGUAGES.find((language) => language.extensions.includes(ext)) ?? null
}

/** The union of every registered language's extensions. */
export function allExtensions(): string[] {
  return LANGUAGES.flatMap((language) => language.extensions)
}
