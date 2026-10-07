import {
  readASTCodeGroupGraph,
  type ASTCodeGroupGraph,
  type DiagramNode,
  type LineRange,
} from "@/ast-graph"
import { generateBlastRadiusDiagram } from "@/blast-radius-diagram"
import { generateCodeWalkthrough, type LinkedCodeWalkthrough } from "@/code-walkthrough"
import { diffLinesOf } from "@/diff-lines"
import {
  clusterImportGraphs,
  createImportGraphContext,
  traceImportGraph,
  type ImportGraphChange,
  type ImportGraphContext,
  type ImportGraphFile,
} from "@/import-graph"
import { generateJourneyFlowDiagram } from "@/journey-flow-diagram"
import type { Blast, JourneyFlow } from "@flightplan/configurations"
import type { GitAdapter, TargetRef } from "@flightplan/git-forge"

export { ASTCodeGroupGraph } from "./ast-graph"
export * from "./blast-radius-diagram"
export * from "./blast/build"
export * from "./blast/filter"
export * from "./blast/layout"
export * from "./code-walkthrough"
export * from "./code/highlight-review"
export * from "./code/highlighter"
export * from "./code/lines"
export * from "./code/links"
export * from "./code/marked-source"
export * from "./core/build-multi-language-diagram"
export type * from "./core/types"
export * from "./diagram/settings"
export * from "./diff-lines"
export * from "./journey-flow-diagram"
export * from "./diagram/reach"
export * from "./journey/build"
export * from "./journey/filter"
export * from "./journey/layout"
export * from "./prose/parse-prose"
export type * from "./review-view-context"
export * from "./scaffold/build-scaffold"
export * from "./scaffold/hunks"
export * from "./scaffold/source-lines"
export * from "./walkthrough/build"
export * from "./walkthrough/reviewed-marks"
export * from "./walkthrough/waypoints"

export interface CodegraphSegment {
  readonly title: string | null
  readonly importGraph: readonly ImportGraphFile[]
  readonly astGraph: ASTCodeGroupGraph
  readonly journeyFlowDiagram: JourneyFlow | null
  readonly blastRadiusDiagram: Blast
  readonly codeWalkthrough: LinkedCodeWalkthrough
}

export interface Codegraph {
  readonly segments: readonly CodegraphSegment[]
}

interface TracedGroup {
  readonly importGraph: readonly ImportGraphFile[]
  readonly astGraph: ASTCodeGroupGraph
}

const FIRST_WAYPOINT_NUMBER = 1

const diffLinesIn = ({ diffTypes, patches }: ImportGraphContext): ReadonlyMap<string, readonly LineRange[]> =>
  new Map(
    [...patches]
      .filter(([filePath]) => diffTypes.get(filePath) !== "deleted")
      .map(([filePath, patch]) => [filePath, diffLinesOf(patch)] as const),
  )

const waypointCountOf = (segments: readonly CodegraphSegment[]): number =>
  segments.flatMap((segment) => segment.codeWalkthrough.files).reduce((count, file) => count + file.waypoints.length, 0)

const listBlastDiagramNodes = (astGraph: ASTCodeGroupGraph, diagramNodes: readonly DiagramNode[]): DiagramNode[] => {
  const declared = [...diagramNodes, ...astGraph.traceLooseDeclarationUsage()]
  return declared.length > 0 ? declared : astGraph.traceLooseDiffUsage()
}

const addSegment = (segments: readonly CodegraphSegment[], { importGraph, astGraph }: TracedGroup): readonly CodegraphSegment[] => {
  const diagramNodes = astGraph.traceAllDiffUsage()
  const journeyFlowDiagram = generateJourneyFlowDiagram(astGraph.astGraphFiles)
  const blastRadiusDiagram = generateBlastRadiusDiagram(listBlastDiagramNodes(astGraph, diagramNodes))
  const codeWalkthrough = generateCodeWalkthrough({
    astGraphFiles: astGraph.astGraphFiles,
    journeyFlowDiagram,
    blastRadiusDiagram,
    firstWaypointNumber: FIRST_WAYPOINT_NUMBER + waypointCountOf(segments),
  })
  return [...segments, { title: null, importGraph, astGraph, journeyFlowDiagram, blastRadiusDiagram, codeWalkthrough }]
}

export interface BranchChange {
  readonly gitAdapter: GitAdapter
  readonly ref: TargetRef
}

export const buildBranchCodegraph = async ({ gitAdapter, ref }: BranchChange): Promise<Codegraph> => {
  const [baseCommit, headCommit] = await Promise.all([gitAdapter.baseSha(ref), gitAdapter.headSha(ref)])
  return await buildCodegraph({ gitAdapter, baseCommit, headCommit })
}

export const buildCodegraph = async (change: ImportGraphChange): Promise<Codegraph> => {
  const context = await createImportGraphContext(change)
  const importGraphs = await Promise.all([...context.diffTypes.keys()].map(async (filePath) => await traceImportGraph(context, filePath)))
  const diffLines = diffLinesIn(context)
  const groups = await Promise.all(
    clusterImportGraphs(importGraphs).map(async (importGraph) => ({
      importGraph,
      astGraph: await readASTCodeGroupGraph({ gitAdapter: change.gitAdapter, importGraph, diffLines }),
    })),
  )
  return { segments: groups.reduce(addSegment, []) }
}
