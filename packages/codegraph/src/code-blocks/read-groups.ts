import {
  clusterImportGraphs,
  createImportGraphContext,
  traceImportGraph,
  type ImportGraphChange,
  type ImportGraphContext,
  type ImportGraphFile,
} from "@/import-graph"
import type { GitAdapter } from "@flightplan/git-forge"
import { readCodeGroup, type CodeFileSource, type ReadCodeGroup } from "./build-group"
import type { PatchDiff } from "./deleted-blocks"
import { splitIntoGroups, type IsLeftOut } from "./group-files"
import { LIBRARIES } from "./libraries"
import { linkCodeGroupGraph } from "./link-group"
import { isTestPath, listConfigPaths, placedClassificationsOf, readRepositoryLocations, type RepositoryLocations } from "./locations"
import { findManifestOf, isManifestPath, readManifest, type PackageManifest } from "./manifests"
import { diffsOf } from "./patch-ranges"
import type { StoredCodeGroupGraph } from "./stored-types"
import type { ASTCodeGroupGraph } from "./types"

type SourcesByCommit = ReadonlyMap<string, ReadonlyMap<string, string>>

const DELETED = "deleted"
const NO_IMPORTED_FILE_PATHS: ReadonlyMap<string, string> = new Map()

const looseFileOf = (filePath: string, { headCommit }: ImportGraphContext): ImportGraphFile => ({
  filePath,
  gitSha: headCommit,
  diffType: "modified",
  importedBy: [],
  importsTo: [],
  importedFilePaths: NO_IMPORTED_FILE_PATHS,
})

const listLooseGroups = (groups: readonly (readonly ImportGraphFile[])[], context: ImportGraphContext): ImportGraphFile[][] => {
  const grouped = new Set(groups.flat().map((file) => file.filePath))
  return [...context.diffTypes]
    .filter(([filePath, diffType]) => diffType !== DELETED && !grouped.has(filePath))
    .map(([filePath]) => [looseFileOf(filePath, context)])
}

const readSources = async (gitAdapter: GitAdapter, files: readonly ImportGraphFile[]): Promise<SourcesByCommit> => {
  const commits = [...new Set(files.map((file) => file.gitSha))]
  const read = await Promise.all(
    commits.map(async (commit) => {
      const filePaths = files.filter((file) => file.gitSha === commit).map((file) => file.filePath)
      return [commit, await gitAdapter.blobs(filePaths, commit)] as const
    }),
  )
  return new Map(read)
}

const diffsIn = ({ diffTypes, patches }: ImportGraphContext, filePath: string): PatchDiff[] => {
  const patch = patches.get(filePath)
  return patch === undefined || diffTypes.get(filePath) === DELETED ? [] : diffsOf(patch)
}

export interface Repository {
  readonly manifests: readonly PackageManifest[]
  readonly locations: RepositoryLocations
}

interface ReadChange {
  readonly sources: SourcesByCommit
  readonly repository: Repository
  readonly context: ImportGraphContext
}

const sourceOf = (file: ImportGraphFile, { sources, repository, context }: ReadChange): CodeFileSource[] => {
  const source = sources.get(file.gitSha)?.get(file.filePath)
  if (source === undefined) return []
  const { filePath, importedBy, importedFilePaths } = file
  const manifest = findManifestOf(filePath, repository.manifests)
  return [{
    filePath,
    source,
    importedBy,
    importedFilePaths,
    diffs: diffsIn(context, filePath),
    placedClassifications: placedClassificationsOf(filePath, repository.locations),
    ...(isTestPath(filePath, repository.locations) ? { isUnread: true } : {}),
    ...(manifest === null ? {} : { manifest }),
  }]
}

const textsOf = (paths: readonly string[], written: ReadonlyMap<string, string>): (readonly [string, string])[] =>
  paths.flatMap((filePath) => {
    const text = written.get(filePath)
    return text === undefined ? [] : [[filePath, text] as const]
  })

export const readRepository = async (gitAdapter: GitAdapter, commit: string): Promise<Repository> => {
  const filePaths = await gitAdapter.listFiles(commit)
  const manifestPaths = filePaths.filter(isManifestPath)
  const configPaths = listConfigPaths(filePaths, LIBRARIES)
  const wanted = [...new Set([...manifestPaths, ...configPaths])]
  const written = wanted.length === 0 ? new Map<string, string>() : await gitAdapter.blobs(wanted, commit)
  const manifests = textsOf(manifestPaths, written).map(([manifestPath, text]) => readManifest(manifestPath, text))
  const configTextByPath = new Map(textsOf(configPaths, written))
  return { manifests, locations: readRepositoryLocations({ manifests, configTextByPath, libraries: LIBRARIES }) }
}

export interface TracedChange {
  readonly gitAdapter: GitAdapter
  readonly context: ImportGraphContext
  readonly importGraphByPath: ReadonlyMap<string, readonly ImportGraphFile[]>
}

export const readCodeGroups = async ({ gitAdapter, context, importGraphByPath }: TracedChange): Promise<ReadCodeGroup[]> => {
  const repository = await readRepository(gitAdapter, context.headCommit)
  const isTest: IsLeftOut = (filePath) => isTestPath(filePath, repository.locations)
  const importGraphs = [...importGraphByPath].filter(([filePath]) => !isTest(filePath)).map(([, importGraph]) => importGraph)
  const traced = clusterImportGraphs(importGraphs).flatMap((cluster) => splitIntoGroups(cluster, isTest))
  const groups = [...traced, ...listLooseGroups(traced, context)]
  const sources = await readSources(gitAdapter, groups.flat())
  return groups.map((group) => readCodeGroup(group.flatMap((file) => sourceOf(file, { sources, repository, context }))))
}

export const readStoredCodeGroupGraphs = async (traced: TracedChange): Promise<StoredCodeGroupGraph[]> =>
  (await readCodeGroups(traced)).map((read) => read.group)

export const readCodeGroupGraphs = async (change: ImportGraphChange): Promise<ASTCodeGroupGraph[]> => {
  const context = await createImportGraphContext(change)
  const changedPaths = [...context.diffTypes.keys()]
  const importGraphs = await Promise.all(changedPaths.map(async (filePath) => await traceImportGraph(context, filePath)))
  const importGraphByPath = new Map(changedPaths.map((filePath, index) => [filePath, importGraphs[index]] as const))
  const stored = await readStoredCodeGroupGraphs({ gitAdapter: change.gitAdapter, context, importGraphByPath })
  return stored.map(linkCodeGroupGraph)
}
