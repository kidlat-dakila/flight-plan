import { Memo } from "@/core/memo"
import type { ChangedFile, GitAdapter } from "@flightplan/git-forge"
import type { ImportLanguage } from "./languages/language"
import { readRepositorySnapshot, type RepositorySnapshot } from "./repository-snapshot"
import { sortedPaths } from "./sorted-paths"

export type DiffType = "modified" | "added" | "deleted"

export interface ImportTracer {
  readonly commit: string
  readonly files: ReadonlySet<string>
  readonly importsOf: (filePath: string) => Promise<readonly string[]>
  readonly importersOf: (filePath: string) => Promise<readonly string[]>
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

const createImportTracer = (snapshot: RepositorySnapshot, language: ImportLanguage): ImportTracer => {
  const reader = language.createImportReader(snapshot)
  const importers = new Memo<string, Promise<readonly string[]>>()

  const findImportersOf = async (filePath: string): Promise<readonly string[]> => {
    const patterns = await reader.importerPatternsOf(filePath)
    const candidates = await snapshot.search({ patterns, extensions: language.extensions })
    const found = await Promise.all(
      candidates
        .filter((candidate) => candidate !== filePath)
        .map(async (candidate) => ((await reader.importsOf(candidate)).includes(filePath) ? [candidate] : [])),
    )
    return sortedPaths(found.flat())
  }

  return {
    commit: snapshot.commit,
    files: snapshot.files,
    importsOf: reader.importsOf,
    importersOf: async (filePath) => await importers.remember(filePath, async () => await findImportersOf(filePath)),
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
