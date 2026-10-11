import { listASTGraphFiles, type ASTGraphFile, type LineRange } from "@/ast-graph"
import { generateBlastRadiusDiagram } from "@/blast-radius-diagram"
import { generateBlastFromBlocks } from "@/blast-radius-diagram/from-blocks"
import { linkCodeGroupGraph, readCodeGroups, type ReadCodeGroup, type StoredCodeGroupGraph } from "@/code-blocks"
import { cutSegments, listReachedFilePaths, type CodeSegmentKind } from "@/code-blocks/segments"
import { generateCodeReferences, type FileCodeReferences } from "@/code-references"
import type { LinkedCodeWalkthrough } from "@/code-walkthrough"
import { generateWalkthroughFromBlocks } from "@/code-walkthrough/from-blocks"
import { diffLinesOf } from "@/diff-lines"
import {
  clusterImportGraphs,
  createImportGraphContext,
  traceImportGraph,
  type ImportGraphChange,
  type ImportGraphContext,
  type ImportGraphFile,
} from "@/import-graph"
import { generateJourneyFlowDiagram, listJourneyNodes } from "@/journey-flow-diagram"
import type { ASTCodeGroupGraph, Blast, DiffType, JourneyFlowDiagram } from "@flightplan/configurations"
import type { GitAdapter, TargetRef } from "@flightplan/git-forge"

export * from "./blast-radius-diagram"
export * from "./blast/assessment"
export * from "./blast/build"
export * from "./blast/layout"
export { findLibrary, listRepositoryConventions } from "./catalogue/find-library"
export { BUILT_IN_LIBRARIES } from "./catalogue/libraries"
export { listCatalogueProblems, listLibraryProblems } from "./catalogue/library-problems"
export { countPatternMatches, type RepositoryFile } from "./catalogue/matching/count-matches"
export { languageOfFile, matchFilePath, matchSource, type MatchedSource } from "./catalogue/matching/match-source"
export type { MatchedSlot, PatternMatch } from "./catalogue/matching/match-sites"
export { listPatternKeys, patternKeyOf } from "./catalogue/pattern-keys"
export { checkProposedLibraries, type PatternMatches, type ProposalCheck } from "./catalogue/proposed-patterns"
export type { BlockMade, CatalogueLibrary, CataloguePattern, LibraryLanguage, SlotPosition, SlotRuns } from "./catalogue/types"
export * from "./code-blocks"
export * from "./code-references"
export type * from "./code-walkthrough"
export * from "./code/definitions"
export * from "./code/highlight-review"
export * from "./code/highlighter"
export * from "./code/lines"
export * from "./code/links"
export * from "./code/marked-source"
export * from "./diagram/settings"
export * from "./diff-lines"
export * from "./journey-flow-diagram"
export { listJourneyPaths } from "./journey-flow-diagram/paths"
export * from "./diagram/reach"
export * from "./journey-flow-diagram/stored"
export * from "./journey/build"
export * from "./journey/names"
export * from "./prose/parse-prose"
export type * from "./review-view-context"
export * from "./scaffold/build-scaffold"
export * from "./scaffold/hunks"
export * from "./scaffold/source-lines"
export * from "./walkthrough/build"
export * from "./walkthrough/reviewed-marks"
export * from "./walkthrough/waypoints"

export type CodegraphSegmentKind = CodeSegmentKind

export interface CodegraphSegment {
  readonly title: string | null
  readonly kind: CodegraphSegmentKind
  readonly importGraph: readonly ImportGraphFile[]
  readonly journeyFlowDiagram: JourneyFlowDiagram | null
  readonly blastRadiusDiagram: Blast | null
  readonly codeWalkthrough: LinkedCodeWalkthrough
  readonly codeReferences: readonly FileCodeReferences[]
}

export interface Codegraph {
  readonly segments: readonly CodegraphSegment[]
}

interface TracedCluster {
  readonly importGraph: readonly ImportGraphFile[]
  readonly astGraphFiles: readonly ASTGraphFile[]
  readonly codeGroups: readonly StoredCodeGroupGraph[]
}

interface PlannedSegment {
  readonly cluster: TracedCluster
  readonly group: StoredCodeGroupGraph | null
  readonly kind: CodegraphSegmentKind
  readonly filePaths: readonly string[]
  readonly sharedFilePaths: readonly string[]
  readonly deletedFilePaths: readonly string[]
}

interface Drawing {
  readonly linkedGroupOf: (group: StoredCodeGroupGraph) => ASTCodeGroupGraph
  readonly diffTypes: ReadonlyMap<string, DiffType>
  readonly segmentCount: number
}

const FIRST_WAYPOINT_NUMBER = 1
const DELETED: DiffType = "deleted"
const NO_WALKTHROUGH: LinkedCodeWalkthrough = { intro: null, files: [] }

const diffLinesIn = ({ diffTypes, patches }: ImportGraphContext): ReadonlyMap<string, readonly LineRange[]> =>
  new Map(
    [...patches]
      .filter(([filePath]) => diffTypes.get(filePath) !== DELETED)
      .map(([filePath, patch]) => [filePath, diffLinesOf(patch)] as const),
  )

const waypointCountOf = (segments: readonly CodegraphSegment[]): number =>
  segments.flatMap((segment) => segment.codeWalkthrough.files).reduce((count, file) => count + file.waypoints.length, 0)

const listViewedPaths = (journeyFlowDiagram: JourneyFlowDiagram | null, codeWalkthrough: LinkedCodeWalkthrough): string[] => [
  ...codeWalkthrough.files.map((file) => file.path),
  ...listJourneyNodes(journeyFlowDiagram?.journeyNodes ?? []).map((node) => node.codeBlocks[0].astGraph.filePath),
]

const listGroupsWithin = (readGroups: readonly ReadCodeGroup[], importGraph: readonly ImportGraphFile[]): ReadCodeGroup[] => {
  const filePaths = new Set(importGraph.map((file) => file.filePath))
  return readGroups.filter(({ group }) => group.astGraphs.some((astGraph) => filePaths.has(astGraph.filePath)))
}

const clusterOf = (importGraph: readonly ImportGraphFile[], readGroups: readonly ReadCodeGroup[], diffLines: ReadonlyMap<string, readonly LineRange[]>): TracedCluster => {
  const within = listGroupsWithin(readGroups, importGraph)
  return { importGraph, codeGroups: within.map((read) => read.group), astGraphFiles: within.flatMap((read) => listASTGraphFiles(read.readSyntaxByPath(), diffLines)) }
}

const planGroup = (cluster: TracedCluster, group: StoredCodeGroupGraph): PlannedSegment[] => {
  const cuts = cutSegments(group)
  const sharedFilePaths = cuts.filter((cut) => cut.kind === "shared").flatMap((cut) => cut.filePaths)
  return cuts.map(({ kind, filePaths }) => ({ cluster, group, kind, filePaths, sharedFilePaths, deletedFilePaths: [] }))
}

const withDeletedFiles = (planned: readonly PlannedSegment[], cluster: TracedCluster): PlannedSegment[] => {
  const deletedFilePaths = cluster.importGraph.filter((file) => file.diffType === DELETED).map((file) => file.filePath)
  if (deletedFilePaths.length === 0) return [...planned]
  if (planned.length === 0) return [{ cluster, group: null, kind: "entry", filePaths: [], sharedFilePaths: [], deletedFilePaths }]
  return planned.map((segment, position) => (position === 0 ? { ...segment, deletedFilePaths } : segment))
}

const planCluster = (cluster: TracedCluster): PlannedSegment[] =>
  withDeletedFiles(cluster.codeGroups.flatMap((group) => planGroup(cluster, group)), cluster)

const importGraphOf = ({ cluster, group, filePaths, deletedFilePaths }: PlannedSegment): ImportGraphFile[] => {
  const groupPaths = new Set(group?.astGraphs.map((astGraph) => astGraph.filePath))
  const ownPaths = new Set([...filePaths, ...deletedFilePaths])
  return cluster.importGraph.filter((file) => ownPaths.has(file.filePath) || (file.diffType === null && groupPaths.has(file.filePath)))
}

const blastOfDeleted = (importGraph: readonly ImportGraphFile[], deletedFilePaths: readonly string[]): Blast => {
  const drawn = importGraph.filter((file) => deletedFilePaths.includes(file.filePath) || file.importsTo.some((imported) => deletedFilePaths.includes(imported)))
  return generateBlastRadiusDiagram(drawn.map((file) => ({ ...file, importsTo: file.importsTo.filter((imported) => deletedFilePaths.includes(imported)) })))
}

const joinBlasts = (one: Blast, two: Blast): Blast => ({
  nodes: [...one.nodes, ...two.nodes.filter((node) => one.nodes.every((drawn) => drawn.path !== node.path))],
  edges: [...one.edges, ...two.edges.filter((edge) => one.edges.every((drawn) => drawn.importer !== edge.importer || drawn.imported !== edge.imported))],
})

const blastOf = ({ cluster, group, kind, filePaths, deletedFilePaths }: PlannedSegment, { diffTypes, segmentCount }: Drawing): Blast | null => {
  const ofDeleted = deletedFilePaths.length === 0 ? null : blastOfDeleted(cluster.importGraph, deletedFilePaths)
  if (group === null) return ofDeleted
  const isAlwaysDrawn = segmentCount === 1 || kind === "shared"
  if (!isAlwaysDrawn && ofDeleted === null && listReachedFilePaths(group, filePaths).length === 0) return null
  const ofBlocks = generateBlastFromBlocks({ group, filePaths, diffTypes })
  return ofDeleted === null ? ofBlocks : joinBlasts(ofBlocks, ofDeleted)
}

const journeyOf = ({ cluster, group, kind, filePaths, sharedFilePaths }: PlannedSegment, { linkedGroupOf }: Drawing): JourneyFlowDiagram | null => {
  if (group === null || kind === "shared") return null
  const isWholeGroup = sharedFilePaths.length === 0 && group.astGraphs.every((astGraph) => astGraph.diffBlockIds.length === 0 || filePaths.includes(astGraph.filePath))
  const groupPaths = new Set(group.astGraphs.map((astGraph) => astGraph.filePath))
  const importGraphGroup = cluster.importGraph.filter((file) => groupPaths.has(file.filePath))
  return generateJourneyFlowDiagram({ group: linkedGroupOf(group), importGraphGroup, scope: isWholeGroup ? null : { filePaths, sharedFilePaths } })
}

const addSegment = (drawing: Drawing) => (segments: readonly CodegraphSegment[], planned: PlannedSegment): readonly CodegraphSegment[] => {
  const { cluster, group, kind, filePaths } = planned
  const journeyFlowDiagram = journeyOf(planned, drawing)
  const codeWalkthrough = group === null
    ? NO_WALKTHROUGH
    : generateWalkthroughFromBlocks({ group, filePaths, journeyFlowDiagram, firstWaypointNumber: FIRST_WAYPOINT_NUMBER + waypointCountOf(segments) })
  const codeReferences = generateCodeReferences(cluster.astGraphFiles, listViewedPaths(journeyFlowDiagram, codeWalkthrough))
  const segment: CodegraphSegment = {
    title: null,
    kind,
    importGraph: importGraphOf(planned),
    journeyFlowDiagram,
    blastRadiusDiagram: blastOf(planned, drawing),
    codeWalkthrough,
    codeReferences,
  }
  return [...segments, segment]
}

export interface BranchChange {
  readonly gitAdapter: GitAdapter
  readonly ref: TargetRef
}

export const buildBranchCodegraph = async ({ gitAdapter, ref }: BranchChange): Promise<Codegraph> => {
  const [baseCommit, headCommit] = await Promise.all([gitAdapter.baseSha(ref), gitAdapter.headSha(ref)])
  return await buildCodegraph({ gitAdapter, baseCommit, headCommit })
}

const looseClusterOf = (group: StoredCodeGroupGraph, { diffTypes, headCommit }: ImportGraphContext): TracedCluster => ({
  importGraph: group.astGraphs.map(({ filePath }) => ({
    filePath,
    gitSha: headCommit,
    diffType: diffTypes.get(filePath) ?? null,
    importedBy: [],
    importsTo: [],
    importedFilePaths: new Map<string, string>(),
  })),
  astGraphFiles: [],
  codeGroups: [group],
})

export const buildCodegraph = async (change: ImportGraphChange): Promise<Codegraph> => {
  const context = await createImportGraphContext(change)
  const changedPaths = [...context.diffTypes.keys()]
  const importGraphs = await Promise.all(changedPaths.map(async (filePath) => await traceImportGraph(context, filePath)))
  const importGraphByPath = new Map(changedPaths.map((filePath, index) => [filePath, importGraphs[index]] as const))
  const readGroups = await readCodeGroups({ gitAdapter: change.gitAdapter, context, importGraphByPath })
  const codeGroups = readGroups.map((read) => read.group)
  const diffLines = diffLinesIn(context)
  const clusters = clusterImportGraphs(importGraphs).map((importGraph) => clusterOf(importGraph, readGroups, diffLines))
  const clusteredGroups = new Set(clusters.flatMap((cluster) => cluster.codeGroups))
  const looseClusters = codeGroups.filter((group) => !clusteredGroups.has(group)).map((group) => looseClusterOf(group, context))
  const planned = [...clusters, ...looseClusters].flatMap(planCluster)
  const linkedByGroup = new Map(codeGroups.map((group) => [group, linkCodeGroupGraph(group)] as const))
  const linkedGroupOf = (group: StoredCodeGroupGraph): ASTCodeGroupGraph => linkedByGroup.get(group) ?? linkCodeGroupGraph(group)
  const drawing: Drawing = { linkedGroupOf, diffTypes: context.diffTypes, segmentCount: planned.length }
  return { segments: planned.reduce(addSegment(drawing), []) }
}
