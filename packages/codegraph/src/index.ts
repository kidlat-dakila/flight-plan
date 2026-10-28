import { listASTGraphFiles, type ASTGraphFile, type LineRange } from "@/ast-graph"
import { generateBlastDiagram } from "@/blast-diagram"
import { generateBlastFromBlocks } from "@/blast-diagram/from-blocks"
import { generateImportBound } from "@/blast-diagram/import-bound"
import { linkCodeGroupGraph, readCodeGroups, type ReadCodeGroup, type StoredCodeGroupGraph } from "@/code-blocks"
import { cutSegments, listReachedFilePaths, type CodeSegmentKind } from "@/code-blocks/segments"
import { generateCodeReferences, type ExportedNamesByPath, type FileCodeReferences } from "@/code-references"
import type { LinkedCodeWalkthrough } from "@/code-walkthrough"
import { generateWalkthroughFromBlocks } from "@/code-walkthrough/from-blocks"
import { diffLinesOf } from "@/diff-lines"
import {
  clusterImportGraphs,
  createImportGraphContext,
  traceImportGraph,
  withoutIgnoredPaths,
  type ImportGraphChange,
  type ImportGraphContext,
  type ImportGraphFile,
} from "@/import-graph"
import { hunkOfPatch, type HunksByPath } from "@/scaffold/hunks"
import { assembleReviewArtifact, listSourcePaths, segmentIdOf, type SegmentParts } from "@/scaffold/review-artifact"
import { walkBreadthFirst } from "@/shared/reach"
import { generateTraceDiagram, listTraceNodes } from "@/trace-diagram"
import type { ASTCodeGroupGraph, Blast, CodeBlockType, DiffType, TraceDiagram, ReviewArtifact } from "@flightplan/configurations"
import type { GitAdapter, TargetRef } from "@flightplan/git-forge"

export * from "./blast-diagram"
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
export * from "./code-walkthrough/stored"
export * from "./code/definitions"
export * from "./code/highlight-review"
export * from "./code/highlighter"
export { createCodeHighlighter } from "./code/lighter-highlighter"
export * from "./code/lines"
export * from "./code/links"
export * from "./code/marked-source"
export * from "./diagram/settings"
export * from "./diff-lines"
export { isIgnoredPath } from "./import-graph/ignored-paths"
export * from "./trace-diagram"
export * from "./trace-diagram/added-cards"
export { listTracePaths } from "./trace-diagram/paths"
export * from "./diagram/reach"
export * from "./trace-diagram/stored"
export * from "./trace/build"
export * from "./trace/names"
export { cardRowNameOf, listCardRowNames, type CardRowKind, type CardRowName } from "./trace/row-names"
export * from "./prose/parse-prose"
export type * from "./review-view-context"
export * from "./review-page/review-view"
export * from "./review-page/segment-heading"
export * from "./review-page/trace-band"
export * from "./review-page/trace-page"
export * from "./scaffold/context-code-blocks"
export * from "./scaffold/hunks"
export * from "./scaffold/review-artifact"
export * from "./scaffold/source-lines"
export * from "./walkthrough/build"
export * from "./walkthrough/change-overview"
export * from "./walkthrough/file-summary"
export * from "./walkthrough/reviewable-file"
export * from "./walkthrough/waypoint-filter"
export * from "./walkthrough/waypoints"

export type CodegraphSegmentKind = CodeSegmentKind

export interface CodegraphSegment {
  readonly title: string | null
  readonly kind: CodegraphSegmentKind
  readonly importGraph: readonly ImportGraphFile[]
  readonly traceDiagram: TraceDiagram | null
  readonly blastDiagram: Blast | null
  readonly hiddenBlastDiagram: Blast | null
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
  readonly unreadSegments: readonly PlannedSegment[]
}

interface Drawing {
  readonly linkedGroupOf: (group: StoredCodeGroupGraph) => ASTCodeGroupGraph
  readonly diffTypes: ReadonlyMap<string, DiffType>
  readonly segmentCount: number
  readonly isSegmented: boolean
}

const FIRST_WAYPOINT_NUMBER = 1
const DELETED: DiffType = "deleted"
const SHARED: CodegraphSegmentKind = "shared"
const UNREAD_FILE: CodeBlockType = "file"
const NO_WALKTHROUGH: LinkedCodeWalkthrough = { files: [] }

const diffLinesIn = ({ diffTypes, patches }: ImportGraphContext): ReadonlyMap<string, readonly LineRange[]> =>
  new Map(
    [...patches]
      .filter(([filePath]) => diffTypes.get(filePath) !== DELETED)
      .map(([filePath, patch]) => [filePath, diffLinesOf(patch)] as const),
  )

const waypointCountOf = (segments: readonly CodegraphSegment[]): number =>
  segments.flatMap((segment) => segment.codeWalkthrough.files).reduce((count, file) => count + file.waypoints.length, 0)

const listViewedPaths = (traceDiagram: TraceDiagram | null, codeWalkthrough: LinkedCodeWalkthrough): string[] => [
  ...codeWalkthrough.files.map((file) => file.path),
  ...listTraceNodes(traceDiagram?.traceNodes ?? []).map((node) => node.codeBlocks[0].astGraph.filePath),
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
  return cuts.map(({ kind, filePaths }) => ({ cluster, group, kind, filePaths, sharedFilePaths, deletedFilePaths: [], unreadSegments: [] }))
}

const withDeletedFiles = (planned: readonly PlannedSegment[], cluster: TracedCluster): PlannedSegment[] => {
  const deletedFilePaths = cluster.importGraph.filter((file) => file.diffType === DELETED).map((file) => file.filePath)
  if (deletedFilePaths.length === 0) return [...planned]
  if (planned.length === 0) return [{ cluster, group: null, kind: "entry", filePaths: [], sharedFilePaths: [], deletedFilePaths, unreadSegments: [] }]
  return planned.map((segment, position) => (position === 0 ? { ...segment, deletedFilePaths } : segment))
}

const planCluster = (cluster: TracedCluster): PlannedSegment[] =>
  withDeletedFiles(cluster.codeGroups.flatMap((group) => planGroup(cluster, group)), cluster)

const isUnread = ({ group, deletedFilePaths }: PlannedSegment): boolean =>
  group !== null && deletedFilePaths.length === 0 && group.codeBlocks.every((block) => block.type === UNREAD_FILE)

const withUnreadInShared = (planned: readonly PlannedSegment[]): readonly PlannedSegment[] => {
  const unreadSegments = planned.filter(isUnread)
  const shared = planned.find((segment) => segment.kind === SHARED)
  if (shared === undefined || unreadSegments.length === 0) return planned
  return planned.filter((segment) => !unreadSegments.includes(segment)).map((segment) => (segment === shared ? { ...segment, unreadSegments } : segment))
}

const importGraphOf = ({ cluster, group, filePaths, deletedFilePaths }: PlannedSegment): ImportGraphFile[] => {
  const groupPaths = new Set(group?.astGraphs.map((astGraph) => astGraph.filePath))
  const ownPaths = new Set([...filePaths, ...deletedFilePaths])
  return cluster.importGraph.filter((file) => ownPaths.has(file.filePath) || (file.diffType === null && groupPaths.has(file.filePath)))
}

const blastOfDeleted = (importGraph: readonly ImportGraphFile[], deletedFilePaths: readonly string[]): Blast => {
  const drawn = importGraph.filter((file) => deletedFilePaths.includes(file.filePath) || file.importsTo.some((imported) => deletedFilePaths.includes(imported)))
  return generateBlastDiagram(drawn.map((file) => ({ ...file, importsTo: file.importsTo.filter((imported) => deletedFilePaths.includes(imported)) })))
}

const joinBlasts = (one: Blast, two: Blast): Blast => ({
  nodes: [...one.nodes, ...two.nodes.filter((node) => one.nodes.every((drawn) => drawn.path !== node.path))],
  edges: [...one.edges, ...two.edges.filter((edge) => one.edges.every((drawn) => drawn.importer !== edge.importer || drawn.imported !== edge.imported))],
})

const otherSharedFilePathsOf = ({ kind, sharedFilePaths }: PlannedSegment): readonly string[] => (kind === "shared" ? [] : sharedFilePaths)

const blastOfDeletedIn = ({ cluster, deletedFilePaths }: PlannedSegment): Blast | null =>
  deletedFilePaths.length === 0 ? null : blastOfDeleted(cluster.importGraph, deletedFilePaths)

const blastOf = (planned: PlannedSegment, { diffTypes }: Drawing): Blast | null => {
  const { group, filePaths } = planned
  const ofDeleted = blastOfDeletedIn(planned)
  if (group === null) return ofDeleted
  const ofBlocks = generateBlastFromBlocks({ group, filePaths, sharedFilePaths: otherSharedFilePathsOf(planned), diffTypes })
  const exportBound = ofDeleted === null ? ofBlocks : joinBlasts(ofBlocks, ofDeleted)
  return { ...exportBound, importBound: generateImportBound({ group, filePaths, diffTypes }) }
}

const isBlastDrawnInSegments = (planned: PlannedSegment, { segmentCount }: Drawing): boolean => {
  const { group, kind, filePaths } = planned
  if (group === null || segmentCount === 1 || kind === "shared" || blastOfDeletedIn(planned) !== null) return true
  return listReachedFilePaths(group, filePaths, otherSharedFilePathsOf(planned)).length > 0
}

interface DrawnFiles {
  readonly filePaths: readonly string[]
  readonly sharedFilePaths: readonly string[]
}

const drawnFilesOf = ({ kind, filePaths, sharedFilePaths }: PlannedSegment, { isSegmented }: Drawing): DrawnFiles =>
  isSegmented || kind === SHARED ? { filePaths, sharedFilePaths } : { filePaths: [...filePaths, ...sharedFilePaths], sharedFilePaths: [] }

const isFoldedIntoLines = ({ kind }: PlannedSegment, { isSegmented }: Drawing): boolean => !isSegmented && kind === SHARED

const traceOf = (planned: PlannedSegment, drawing: Drawing): TraceDiagram | null => {
  const { cluster, group, kind } = planned
  if (group === null || isFoldedIntoLines(planned, drawing)) return null
  const { linkedGroupOf } = drawing
  const { filePaths, sharedFilePaths } = drawnFilesOf(planned, drawing)
  const isWholeGroup = sharedFilePaths.length === 0 && group.astGraphs.every((astGraph) => astGraph.diffBlockIds.length === 0 || filePaths.includes(astGraph.filePath))
  const groupPaths = new Set(group.astGraphs.map((astGraph) => astGraph.filePath))
  const importGraphGroup = cluster.importGraph.filter((file) => groupPaths.has(file.filePath))
  const otherSharedFilePaths = kind === "shared" ? [] : sharedFilePaths
  const otherLineFilePaths = group.astGraphs
    .filter((astGraph) => astGraph.diffBlockIds.length > 0 && !filePaths.includes(astGraph.filePath) && !sharedFilePaths.includes(astGraph.filePath))
    .map((astGraph) => astGraph.filePath)
  const scope = { filePaths, sharedFilePaths: otherSharedFilePaths, otherLineFilePaths, lineFilePaths: planned.filePaths }
  return generateTraceDiagram({ group: linkedGroupOf(group), importGraphGroup, scope: isWholeGroup ? null : scope })
}

const NO_EXPORTED_NAMES: ExportedNamesByPath = new Map()

const reachImporters = (startPaths: readonly string[], importersOf: ReadonlyMap<string, readonly string[]>): ReadonlySet<string> =>
  new Set(walkBreadthFirst(startPaths, { nextOf: (filePath) => importersOf.get(filePath) ?? [], keyOf: (filePath) => filePath }))

const listFullyImportedPaths = (importGraph: readonly ImportGraphFile[]): ReadonlySet<string> =>
  reachImporters(
    importGraph.filter((file) => file.diffType !== null).map((file) => file.filePath),
    new Map(importGraph.map((file) => [file.filePath, file.importedBy] as const)),
  )

const exportedNamesIn = (group: StoredCodeGroupGraph | null, importGraph: readonly ImportGraphFile[]): ExportedNamesByPath => {
  if (group === null) return NO_EXPORTED_NAMES
  const fullyImported = listFullyImportedPaths(importGraph)
  return new Map(
    group.astGraphs.filter((astGraph) => fullyImported.has(astGraph.filePath)).map((astGraph) => [astGraph.filePath, Object.keys(astGraph.exports)] as const),
  )
}

const drawSegment = (planned: PlannedSegment, drawing: Drawing, firstWaypointNumber: number): CodegraphSegment => {
  const { cluster, group, kind, filePaths } = planned
  const traceDiagram = traceOf(planned, drawing)
  const blastDiagram = blastOf(planned, drawing)
  const isBlastDrawn = isBlastDrawnInSegments(planned, drawing)
  const codeWalkthrough = group === null
    ? NO_WALKTHROUGH
    : generateWalkthroughFromBlocks({ group: drawing.linkedGroupOf(group), filePaths, traceDiagram, firstWaypointNumber })
  return {
    title: null,
    kind,
    importGraph: importGraphOf(planned),
    traceDiagram,
    blastDiagram: isBlastDrawn ? blastDiagram : null,
    hiddenBlastDiagram: isBlastDrawn ? null : blastDiagram,
    codeWalkthrough,
    codeReferences: generateCodeReferences(cluster.astGraphFiles, listViewedPaths(traceDiagram, codeWalkthrough), exportedNamesIn(group, cluster.importGraph)),
  }
}

const joinDrawnBlasts = (one: Blast | null, two: Blast | null): Blast | null => {
  if (one === null || two === null) return one ?? two
  return { ...one, ...joinBlasts(one, two) }
}

const withUnreadFiles = (segment: CodegraphSegment, unread: CodegraphSegment): CodegraphSegment => ({
  ...segment,
  importGraph: [...segment.importGraph, ...unread.importGraph],
  blastDiagram: joinDrawnBlasts(segment.blastDiagram, unread.blastDiagram),
  hiddenBlastDiagram: joinDrawnBlasts(segment.hiddenBlastDiagram, unread.hiddenBlastDiagram),
  codeWalkthrough: { ...segment.codeWalkthrough, files: [...segment.codeWalkthrough.files, ...unread.codeWalkthrough.files] },
  codeReferences: [...segment.codeReferences, ...unread.codeReferences],
})

const addSegment = (drawing: Drawing) => (segments: readonly CodegraphSegment[], planned: PlannedSegment): readonly CodegraphSegment[] => {
  const firstWaypointNumber = FIRST_WAYPOINT_NUMBER + waypointCountOf(segments)
  const segment = planned.unreadSegments.reduce<CodegraphSegment>(
    (drawn, unread) => withUnreadFiles(drawn, drawSegment(unread, drawing, firstWaypointNumber + waypointCountOf([drawn]))),
    drawSegment(planned, drawing, firstWaypointNumber),
  )
  return [...segments, segment]
}

export interface BranchChange {
  readonly gitAdapter: GitAdapter
  readonly ref: TargetRef
}

export interface Segmentation {
  readonly isSegmented: boolean
}

export const buildBranchCodegraph = async ({ gitAdapter, ref, isSegmented }: BranchChange & Segmentation): Promise<Codegraph> => {
  const [baseCommit, headCommit] = await Promise.all([gitAdapter.baseSha(ref), gitAdapter.headSha(ref)])
  return await buildCodegraph({ gitAdapter, baseCommit, headCommit, isSegmented })
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

const buildCodegraphIn = async (gitAdapter: GitAdapter, context: ImportGraphContext, { isSegmented }: Segmentation): Promise<Codegraph> => {
  const changedPaths = [...context.diffTypes.keys()]
  const importGraphs = await Promise.all(changedPaths.map(async (filePath) => await traceImportGraph(context, filePath)))
  const importGraphByPath = new Map(changedPaths.map((filePath, index) => [filePath, importGraphs[index]] as const))
  const readGroups = await readCodeGroups({ gitAdapter, context, importGraphByPath })
  const codeGroups = readGroups.map((read) => read.group)
  const diffLines = diffLinesIn(context)
  const clusters = clusterImportGraphs(importGraphs).map((importGraph) => clusterOf(importGraph, readGroups, diffLines))
  const clusteredGroups = new Set(clusters.flatMap((cluster) => cluster.codeGroups))
  const looseClusters = codeGroups.filter((group) => !clusteredGroups.has(group)).map((group) => looseClusterOf(group, context))
  const planned = withUnreadInShared([...clusters, ...looseClusters].flatMap(planCluster))
  const linkedByGroup = new Map(codeGroups.map((group) => [group, linkCodeGroupGraph(group)] as const))
  const linkedGroupOf = (group: StoredCodeGroupGraph): ASTCodeGroupGraph => linkedByGroup.get(group) ?? linkCodeGroupGraph(group)
  const drawing: Drawing = { linkedGroupOf, diffTypes: context.diffTypes, segmentCount: planned.length, isSegmented }
  return { segments: planned.reduce(addSegment(drawing), []) }
}

export const buildCodegraph = async (change: ImportGraphChange & Segmentation): Promise<Codegraph> =>
  await buildCodegraphIn(change.gitAdapter, await createImportGraphContext(change), change)

export interface BranchReview extends BranchChange {
  readonly title: string
  readonly newId: () => string
  readonly ignoredPaths: readonly string[]
  readonly isSegmented: boolean
}

export interface BranchReviewArtifact {
  readonly artifact: ReviewArtifact
  readonly baseCommit: string
}

const ADDED: DiffType = "added"
const UNWRITTEN_CONTEXT = ""

const hunksIn = ({ diffTypes, patches }: ImportGraphContext): HunksByPath =>
  Object.fromEntries(
    [...diffTypes].map(([filePath, diffType]) => [filePath, hunkOfPatch(patches.get(filePath) ?? "", diffType === ADDED)] as const),
  )

const toSegmentParts = (segment: CodegraphSegment, id: string): SegmentParts => ({
  id,
  title: segment.title,
  context: UNWRITTEN_CONTEXT,
  importGraph: segment.importGraph,
  traceDiagram: segment.traceDiagram,
  blastDiagram: segment.blastDiagram,
  hiddenBlastDiagram: segment.hiddenBlastDiagram,
  walkthrough: segment.codeWalkthrough,
  codeReferences: segment.codeReferences,
})

export interface CommitReview {
  readonly gitAdapter: GitAdapter
  readonly baseCommit: string
  readonly headCommit: string
  readonly title: string
  readonly newId: () => string
  readonly ignoredPaths: readonly string[]
  readonly isSegmented: boolean
}

export const buildCommitReviewArtifact = async ({ gitAdapter, baseCommit, headCommit, title, newId, ignoredPaths, isSegmented }: CommitReview): Promise<ReviewArtifact> => {
  const context = withoutIgnoredPaths(await createImportGraphContext({ gitAdapter, baseCommit, headCommit }), ignoredPaths)
  const codegraph = await buildCodegraphIn(gitAdapter, context, { isSegmented })
  const segments = codegraph.segments.map((segment) => toSegmentParts(segment, segmentIdOf(newId())))
  const hunks = hunksIn(context)
  const headPaths = listSourcePaths(hunks, segments).filter((path) => context.diffTypes.get(path) !== DELETED)
  const texts = await gitAdapter.blobs(headPaths, headCommit)
  return assembleReviewArtifact({
    title,
    status: "drafting",
    commit: headCommit,
    hunks,
    textOf: (path) => texts.get(path) ?? null,
    segments,
    isSegmented,
  })
}

export const buildBranchReviewArtifact = async ({ gitAdapter, ref, title, newId, ignoredPaths, isSegmented }: BranchReview): Promise<BranchReviewArtifact> => {
  const [baseCommit, headCommit] = await Promise.all([gitAdapter.baseSha(ref), gitAdapter.headSha(ref)])
  return { artifact: await buildCommitReviewArtifact({ gitAdapter, baseCommit, headCommit, title, newId, ignoredPaths, isSegmented }), baseCommit }
}
