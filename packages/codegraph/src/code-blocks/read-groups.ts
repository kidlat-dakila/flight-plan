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
import { splitIntoGroups } from "./group-files"
import { isIgnoredFile } from "./ignored-files"
import { linkCodeGroupGraph } from "./link-group"
import { findManifestOf, isManifestPath, readManifest, type PackageManifest } from "./manifests"
import { diffRangesOf } from "./patch-ranges"
import type { StoredCodeGroupGraph } from "./stored-types"
import type { ASTCodeGroupGraph, SourceRange } from "./types"

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
    .filter(([filePath, diffType]) => diffType !== DELETED && !grouped.has(filePath) && !isIgnoredFile(filePath))
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

const diffRangesIn = ({ diffTypes, patches }: ImportGraphContext, filePath: string): SourceRange[] => {
  const patch = patches.get(filePath)
  return patch === undefined || diffTypes.get(filePath) === DELETED ? [] : diffRangesOf(patch)
}

interface ReadChange {
  readonly sources: SourcesByCommit
  readonly manifests: readonly PackageManifest[]
  readonly context: ImportGraphContext
}

const sourceOf = (file: ImportGraphFile, { sources, manifests, context }: ReadChange): CodeFileSource[] => {
  const source = sources.get(file.gitSha)?.get(file.filePath)
  if (source === undefined) return []
  const { filePath, importedBy, importedFilePaths } = file
  const manifest = findManifestOf(filePath, manifests)
  return [{ filePath, source, importedBy, importedFilePaths, diffRanges: diffRangesIn(context, filePath), ...(manifest === null ? {} : { manifest }) }]
}

const readManifests = async (gitAdapter: GitAdapter, commit: string): Promise<PackageManifest[]> => {
  const manifestPaths = (await gitAdapter.listFiles(commit)).filter(isManifestPath)
  if (manifestPaths.length === 0) return []
  const written = await gitAdapter.blobs(manifestPaths, commit)
  return [...written].map(([manifestPath, text]) => readManifest(manifestPath, text))
}

export interface TracedChange {
  readonly gitAdapter: GitAdapter
  readonly context: ImportGraphContext
  readonly importGraphByPath: ReadonlyMap<string, readonly ImportGraphFile[]>
}

export const readCodeGroups = async ({ gitAdapter, context, importGraphByPath }: TracedChange): Promise<ReadCodeGroup[]> => {
  const importGraphs = [...importGraphByPath].filter(([filePath]) => !isIgnoredFile(filePath)).map(([, importGraph]) => importGraph)
  const traced = clusterImportGraphs(importGraphs).flatMap(splitIntoGroups)
  const groups = [...traced, ...listLooseGroups(traced, context)]
  const [sources, manifests] = await Promise.all([readSources(gitAdapter, groups.flat()), readManifests(gitAdapter, context.headCommit)])
  return groups.map((group) => readCodeGroup(group.flatMap((file) => sourceOf(file, { sources, manifests, context }))))
}

export const readStoredCodeGroupGraphs = async (traced: TracedChange): Promise<StoredCodeGroupGraph[]> =>
  (await readCodeGroups(traced)).map((read) => read.group)

export const readCodeGroupGraphs = async (change: ImportGraphChange): Promise<ASTCodeGroupGraph[]> => {
  const context = await createImportGraphContext(change)
  const changedPaths = [...context.diffTypes.keys()].filter((filePath) => !isIgnoredFile(filePath))
  const importGraphs = await Promise.all(changedPaths.map(async (filePath) => await traceImportGraph(context, filePath)))
  const importGraphByPath = new Map(changedPaths.map((filePath, index) => [filePath, importGraphs[index]] as const))
  const stored = await readStoredCodeGroupGraphs({ gitAdapter: change.gitAdapter, context, importGraphByPath })
  return stored.map(linkCodeGroupGraph)
}
