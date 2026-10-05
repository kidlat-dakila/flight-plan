import { Memo } from "@/core/memo"
import type { ChangedFile, GitAdapter } from "@flightplan/git-forge"
import type { ImportLanguage } from "./languages/language"
import { readRepositorySnapshot, type RepositorySnapshot } from "./repository-snapshot"
import { sortedPaths } from "./sorted-paths"

export type DiffType = "modified" | "added" | "deleted"

export type TraceNeighbours = (filePaths: readonly string[]) => Promise<readonly (readonly string[])[]>

export interface ImportTracer {
  readonly commit: string
  readonly files: ReadonlySet<string>
  readonly importsOf: TraceNeighbours
  readonly importersOf: TraceNeighbours
}

export interface ImportGraphContext {
  readonly baseCommit: string
  readonly headCommit: string
  readonly diffTypes: ReadonlyMap<string, DiffType>
  readonly tracerFor: (commit: string, language: ImportLanguage) => Promise<ImportTracer>
}

export interface ImportGraphChange {
  readonly gitAdapter: GitAdapter
  readonly baseCommit: string
  readonly headCommit: string
}

const ADDED_STATUSES = ["added", "copied"]
const DELETED_STATUSES = ["removed", "deleted"]
const RENAMED_STATUS = "renamed"

const diffTypesOfFile = ({ path, status, previousPath }: ChangedFile): (readonly [string, DiffType])[] => {
  if (status === RENAMED_STATUS && previousPath !== undefined) return [[previousPath, "deleted"], [path, "added"]]
  if (ADDED_STATUSES.includes(status)) return [[path, "added"]]
  if (DELETED_STATUSES.includes(status)) return [[path, "deleted"]]
  return [[path, "modified"]]
}

export const diffTypesOf = (changedFiles: readonly ChangedFile[]): ReadonlyMap<string, DiffType> =>
  new Map(changedFiles.flatMap(diffTypesOfFile))

const FILES_PER_SEARCH = 300

const chunksOf = <Item>(items: readonly Item[], size: number): Item[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_unused, index) => items.slice(index * size, (index + 1) * size))

const createImportTracer = (snapshot: RepositorySnapshot, language: ImportLanguage): ImportTracer => {
  const reader = language.createImportReader(snapshot)
  const importers = new Memo<string, Promise<readonly string[]>>()

  const readImportsOf = async (filePaths: readonly string[]): Promise<readonly (readonly string[])[]> => {
    await snapshot.preload(filePaths)
    return await Promise.all(filePaths.map(async (filePath) => await reader.importsOf(filePath)))
  }

  const findCandidatesOf = async (filePaths: readonly string[]): Promise<string[]> => {
    const patterns = await reader.importerPatternsOf(filePaths)
    return await snapshot.search({ patterns: [...patterns], extensions: language.extensions })
  }

  const findImportersOf = async (filePaths: readonly string[]): Promise<ReadonlyMap<string, readonly string[]>> => {
    const found = await Promise.all(chunksOf(filePaths, FILES_PER_SEARCH).map(findCandidatesOf))
    const candidates = sortedPaths(found.flat())
    const imports = await readImportsOf(candidates)
    return new Map(
      filePaths.map((filePath) => {
        const importing = candidates.filter((candidate, index) => candidate !== filePath && imports[index].includes(filePath))
        return [filePath, importing] as const
      }),
    )
  }

  const searchImportersOf = (filePaths: readonly string[]): void => {
    const unsearched = [...new Set(filePaths)].filter((filePath) => !importers.has(filePath))
    if (unsearched.length === 0) return
    const searching = findImportersOf(unsearched)
    unsearched.forEach((filePath) => {
      void importers.store(filePath, searching.then((found) => found.get(filePath) ?? []))
    })
  }

  return {
    commit: snapshot.commit,
    files: snapshot.files,
    importsOf: readImportsOf,
    importersOf: async (filePaths) => {
      searchImportersOf(filePaths)
      return await Promise.all(filePaths.map(async (filePath) => (await importers.find(filePath)) ?? []))
    },
  }
}

export const createImportGraphContext = async ({
  gitAdapter,
  baseCommit,
  headCommit,
}: ImportGraphChange): Promise<ImportGraphContext> => {
  const comparison = await gitAdapter.compare(baseCommit, headCommit)
  const snapshots = new Memo<string, Promise<RepositorySnapshot>>()
  const tracers = new Memo<string, Promise<ImportTracer>>()
  const snapshotAt = async (commit: string): Promise<RepositorySnapshot> =>
    await snapshots.remember(commit, async () => await readRepositorySnapshot(gitAdapter, commit))

  return {
    baseCommit,
    headCommit,
    diffTypes: diffTypesOf(comparison.files),
    tracerFor: async (commit, language) =>
      await tracers.remember(`${commit}:${language.id}`, async () => createImportTracer(await snapshotAt(commit), language)),
  }
}
