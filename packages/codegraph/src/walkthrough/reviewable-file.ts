import { isInSpan, type RowSpan } from "@/code/lines"
import { BLOCK_TYPE_LABELS, nameOfBlock } from "@/trace/names"
import { rootBlockSpanOf } from "@/walkthrough/root-blocks"
import { fileFingerprint, fingerprintOf, flattenWaypoints, type FlatWaypoint } from "@/walkthrough/waypoints"
import type { CodeBlock, FileSection, ReviewArtifact, Segment, SourceFile } from "@flightplan/configurations"
import type { ReviewableFile, ReviewableWaypoint } from "@flightplan/reviewed-marks"

export interface FileRootBlock {
  readonly id: string
  readonly block: CodeBlock
  readonly label: string
  readonly span: RowSpan | null
}

const NAMED_ID_SEPARATOR = "#"
const NAME_SEPARATOR = ":"
const REPEAT_SEPARATOR = "~"
const FIRST_REPEAT = 2

const startLineOf = (block: CodeBlock): number => block.lineOfCodeRangeReference[0].start.line

const rootBlocksInFile = (path: string, waypoints: readonly FlatWaypoint[]): CodeBlock[] =>
  [...new Set(waypoints.flatMap((flat) => flat.rootBlocks))]
    .filter((root) => root.astGraph.filePath === path)
    .sort((one, two) => startLineOf(one) - startLineOf(two))

const namedIdOf = (path: string, root: CodeBlock): string =>
  root.name === undefined ? root.id : `${path}${NAMED_ID_SEPARATOR}${root.type}${NAME_SEPARATOR}${root.name}`

const withRepeatsTold = (ids: readonly string[]): string[] =>
  ids.map((id, position) => {
    const repeat = ids.slice(0, position).filter((earlier) => earlier === id).length
    return repeat === 0 ? id : `${id}${REPEAT_SEPARATOR}${String(repeat + FIRST_REPEAT - 1)}`
  })

const labelOf = (root: CodeBlock): string =>
  root.name === undefined ? nameOfBlock(root) : `${BLOCK_TYPE_LABELS[root.deletedType ?? root.type]} ${root.name}`

export const listFileRootBlocks = (path: string, waypoints: readonly FlatWaypoint[], source: SourceFile | null): FileRootBlock[] => {
  const roots = rootBlocksInFile(path, waypoints)
  const ids = withRepeatsTold(roots.map((root) => namedIdOf(path, root)))
  return roots.map((root, position) => ({
    id: ids[position],
    block: root,
    label: labelOf(root),
    span: source === null ? null : rootBlockSpanOf(root, source),
  }))
}

const rootBlockIdsOf = (flat: FlatWaypoint, rootBlocks: readonly FileRootBlock[]): string[] =>
  rootBlocks.filter((rootBlock) => flat.rootBlocks.includes(rootBlock.block)).map((rootBlock) => rootBlock.id)

const toReviewableWaypoint = (flat: FlatWaypoint, rootBlocks: readonly FileRootBlock[]): ReviewableWaypoint => ({
  id: flat.waypoint.id,
  fingerprint: flat.fingerprint,
  depth: flat.depth,
  rootBlockIds: rootBlockIdsOf(flat, rootBlocks),
})

const rowTextsIn = (source: SourceFile | null, span: RowSpan | null): string[] =>
  (source?.lines ?? []).filter((_line, index) => isInSpan(index, span)).map((line) => `${line.mark}${line.text}`)

const rootBlockFingerprint = (rootBlock: FileRootBlock, waypoints: readonly ReviewableWaypoint[], source: SourceFile | null): string =>
  fingerprintOf({
    rows: rowTextsIn(source, rootBlock.span),
    waypoints: waypoints.filter((waypoint) => waypoint.rootBlockIds.includes(rootBlock.id)).map((waypoint) => waypoint.fingerprint),
  })

export const reviewableFileOf = (
  path: string,
  waypoints: readonly FlatWaypoint[],
  rootBlocks: readonly FileRootBlock[],
  source: SourceFile | null,
): ReviewableFile => {
  const reviewableWaypoints = waypoints.map((flat) => toReviewableWaypoint(flat, rootBlocks))
  return {
    path,
    fingerprint: fileFingerprint(waypoints),
    waypoints: reviewableWaypoints,
    rootBlocks: rootBlocks.map((rootBlock) => ({ id: rootBlock.id, fingerprint: rootBlockFingerprint(rootBlock, reviewableWaypoints, source) })),
  }
}

const sourceOf = (sources: readonly SourceFile[], path: string): SourceFile | null =>
  sources.find((source) => source.path === path) ?? null

const toReviewableFile = (file: FileSection, sources: readonly SourceFile[]): ReviewableFile => {
  const source = sourceOf(sources, file.path)
  const waypoints = flattenWaypoints(file, source)
  return reviewableFileOf(file.path, waypoints, listFileRootBlocks(file.path, waypoints, source), source)
}

export const reviewableSegmentFilesOf = (segment: Segment, sources: readonly SourceFile[]): ReviewableFile[] =>
  segment.walkthrough.files.map((file) => toReviewableFile(file, sources))

export const reviewableFilesOf = (artifact: ReviewArtifact): ReviewableFile[] =>
  artifact.segments.flatMap((segment) => reviewableSegmentFilesOf(segment, artifact.sources))
