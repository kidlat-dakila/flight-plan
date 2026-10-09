import type { ImportGraphFile } from "@/import-graph/trace-import-graph"
import type { GitAdapter } from "@flightplan/git-forge"
import type { DiagramNode } from "./diagram-node"
import type { BaseASTGraphFile } from "./languages/base"
import { createASTGraphFile, type ASTGraphSource } from "./languages/create-ast-graph-file"
import { traceDeepUsage } from "./trace-deep-usage"
import type { DiffLocation, LineRange } from "./types"

export interface ASTCodeGroupGraphReading {
  readonly gitAdapter: GitAdapter
  readonly importGraph: readonly ImportGraphFile[]
  readonly diffLines: ReadonlyMap<string, readonly LineRange[]>
}

type SourcesByCommit = ReadonlyMap<string, ReadonlyMap<string, string>>

const NO_DIFF_LINES: readonly LineRange[] = []

export class ASTCodeGroupGraph {
  public readonly astGraphFiles: readonly BaseASTGraphFile[]

  public constructor(sources: readonly ASTGraphSource[]) {
    this.astGraphFiles = sources.flatMap((source) => {
      const file = createASTGraphFile(source)
      return file === null ? [] : [file]
    })
  }

  public traceDeepUsageFromAstGraphFile(astGraphFile: BaseASTGraphFile, { parentEncapsulation }: DiffLocation): DiagramNode {
    return traceDeepUsage(this.astGraphFiles, { file: astGraphFile, encapsulation: parentEncapsulation })
  }
}

const readSources = async (gitAdapter: GitAdapter, importGraph: readonly ImportGraphFile[]): Promise<SourcesByCommit> => {
  const commits = [...new Set(importGraph.map((file) => file.gitSha))]
  const read = await Promise.all(
    commits.map(async (commit) => {
      const filePaths = importGraph.filter((file) => file.gitSha === commit).map((file) => file.filePath)
      return [commit, await gitAdapter.blobs(filePaths, commit)] as const
    }),
  )
  return new Map(read)
}

const sourceOf = (file: ImportGraphFile, sources: SourcesByCommit, diffLines: ASTCodeGroupGraphReading["diffLines"]): ASTGraphSource[] => {
  const source = sources.get(file.gitSha)?.get(file.filePath)
  if (source === undefined) return []
  const { filePath, gitSha, importedBy, importsTo, importedFilePaths } = file
  return [{ filePath, gitSha, importedBy, importsTo, importedFilePaths, source, diffLines: diffLines.get(filePath) ?? NO_DIFF_LINES }]
}

export const readASTCodeGroupGraph = async ({ gitAdapter, importGraph, diffLines }: ASTCodeGroupGraphReading): Promise<ASTCodeGroupGraph> => {
  const sources = await readSources(gitAdapter, importGraph)
  return new ASTCodeGroupGraph(importGraph.flatMap((file) => sourceOf(file, sources, diffLines)))
}
