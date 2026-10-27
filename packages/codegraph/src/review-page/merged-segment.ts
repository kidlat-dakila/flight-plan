import type { Blast, BlastEdge, FileSection, ImportBound, Segment } from "@flightplan/configurations"

const MERGED_TITLE = ""

const isSameEdge = (one: BlastEdge, two: BlastEdge): boolean => one.importer === two.importer && one.imported === two.imported

const joinEdges = (edges: readonly BlastEdge[]): BlastEdge[] =>
  edges.filter((edge, position) => edges.findIndex((other) => isSameEdge(edge, other)) === position)

const firstOfEachPath = <Node extends { readonly path: string }>(nodes: readonly Node[]): Node[] =>
  nodes.filter((node, position) => nodes.findIndex((other) => other.path === node.path) === position)

const joinImportBounds = (bounds: readonly ImportBound[]): ImportBound | undefined =>
  bounds.length === 0
    ? undefined
    : { nodes: firstOfEachPath(bounds.flatMap((bound) => bound.nodes)), edges: joinEdges(bounds.flatMap((bound) => bound.edges)) }

const joinBlasts = (blasts: readonly Blast[]): Blast | null => {
  if (blasts.length === 0) return null
  const importBound = joinImportBounds(blasts.flatMap((blast) => (blast.importBound === undefined ? [] : [blast.importBound])))
  return {
    nodes: firstOfEachPath(blasts.flatMap((blast) => blast.nodes)),
    edges: joinEdges(blasts.flatMap((blast) => blast.edges)),
    ...(importBound === undefined ? {} : { importBound }),
  }
}

const joinedBlastsOf = ({ blastDiagram, hiddenBlastDiagram }: Segment): Blast[] =>
  [blastDiagram, hiddenBlastDiagram].filter((blast): blast is Blast => blast !== null && blast !== undefined)

const joinFiles = (files: readonly FileSection[]): FileSection[] =>
  firstOfEachPath(files).map((file) => ({
    path: file.path,
    waypoints: files.filter((other) => other.path === file.path).flatMap((other) => other.waypoints),
  }))

export const mergeSegments = ([first, ...others]: readonly [Segment, ...Segment[]]): Segment => {
  const segments = [first, ...others]
  return {
    id: first.id,
    title: MERGED_TITLE,
    changedPaths: [...new Set(segments.flatMap((segment) => segment.changedPaths))].sort((one, two) => one.localeCompare(two)),
    context: first.context,
    traceDiagram: null,
    blastDiagram: joinBlasts(segments.flatMap(joinedBlastsOf)),
    walkthrough: {
      files: joinFiles(segments.flatMap((segment) => segment.walkthrough.files)),
      isArranged: segments.every((segment) => segment.walkthrough.isArranged === true),
    },
    isContextRequired: first.isContextRequired,
  }
}
