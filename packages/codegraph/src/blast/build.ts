import { countLabel } from "@/prose/count-label"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import type { Blast, BlastBand, BlastEdgeView, BlastFileMark, BlastNode, BlastNodeView, Segment } from "@flightplan/configurations"
import { listReachedPaths } from "./assessment"
import { layoutBlast, type PlacedBlastEdge, type PlacedBlastNode } from "./layout"

const BLAST_ANCHOR_NAME = "blast-diagram"
const PATH_SEPARATOR = "/"
const EXTENSION_SEPARATOR = "."
const FOLDER_ENTRY_NAMES: readonly string[] = ["index", "__init__", "mod", "main"]
const FILE_NAME_SEGMENT_COUNT = 1
const FOLDER_ENTRY_SEGMENT_COUNT = 2

type FileStanding = NonNullable<BlastNode["diffType"]> | NonNullable<BlastNode["impactType"]> | "unassessed" | "unreached"

const STANDING_LABELS: Readonly<Record<FileStanding, string>> = {
  "added": "Added",
  "modified": "Modified",
  "deleted": "Deleted",
  "breaks": "Breaks",
  "behaviour-changes": "Behaviour changes",
  "unaffected": "Unaffected",
  "unassessed": "Not assessed",
  "unreached": "Not reached by the change",
}

const IMPACT_NOTES: Readonly<Partial<Record<FileStanding, string>>> = {
  unaffected: "The change reaches this file, and nothing it does is different.",
  unassessed: "Nobody has assessed what the change does to this file.",
  unreached: "The change cannot reach this file.",
}

const MARKS: Readonly<Record<FileStanding, BlastFileMark>> = {
  "added": "added",
  "modified": "modified",
  "deleted": "deleted",
  "breaks": "breaks",
  "behaviour-changes": "behaviour-changes",
  "unaffected": "plain",
  "unassessed": "plain",
  "unreached": "plain",
}

const LEGEND: BlastBand["legend"] = [
  { mark: "added", label: "Added file" },
  { mark: "modified", label: "Modified file" },
  { mark: "deleted", label: "Deleted file" },
  { mark: "breaks", label: "Breaks" },
  { mark: "behaviour-changes", label: "Behaviour changes" },
  { mark: "plain", label: "File the change did not touch" },
]

const IMPACT_SUMMARY_NOUNS: readonly (readonly [FileStanding, string, string])[] = [
  ["breaks", "breaks", "break"],
  ["behaviour-changes", "changes behaviour", "change behaviour"],
  ["unaffected", "unaffected", "unaffected"],
  ["unassessed", "not assessed", "not assessed"],
]

const standingOf = (node: BlastNode, reachedPaths: ReadonlySet<string>): FileStanding => {
  if (node.diffType !== null) return node.diffType
  if (node.impactType !== null) return node.impactType
  return reachedPaths.has(node.path) ? "unassessed" : "unreached"
}

const lastSegmentsOf = (path: string, segmentCount: number): string => path.split(PATH_SEPARATOR).slice(-segmentCount).join(PATH_SEPARATOR)

const isFolderEntry = (path: string): boolean => {
  const fileName = lastSegmentsOf(path, FILE_NAME_SEGMENT_COUNT)
  return FOLDER_ENTRY_NAMES.includes(fileName.split(EXTENSION_SEPARATOR)[0])
}

const distinctLabelOf = (path: string, paths: readonly string[], segmentCount: number): string => {
  const label = lastSegmentsOf(path, segmentCount)
  const isShared = paths.some((other) => other !== path && lastSegmentsOf(other, segmentCount) === label)
  return isShared && label !== path ? distinctLabelOf(path, paths, segmentCount + 1) : label
}

export const labelBlastFiles = (paths: readonly string[]): ReadonlyMap<string, string> =>
  new Map(
    paths.map((path) => [
      path,
      distinctLabelOf(path, paths, isFolderEntry(path) ? FOLDER_ENTRY_SEGMENT_COUNT : FILE_NAME_SEGMENT_COUNT),
    ] as const),
  )

const fileRowsOf = (paths: readonly string[]): BlastNodeView["imports"]["files"] =>
  [...paths].sort((one, two) => one.localeCompare(two)).map((path) => ({ id: path, label: path }))

interface BlastViewSources {
  readonly blast: Blast
  readonly standingByPath: ReadonlyMap<string, FileStanding>
  readonly labelByPath: ReadonlyMap<string, string>
  readonly fileAnchorIdByPath: ReadonlyMap<string, string>
  readonly knownLinkIds: ReadonlySet<string>
}

const toNodeView = (
  { node, x, y, radius }: PlacedBlastNode,
  { blast, standingByPath, labelByPath, fileAnchorIdByPath, knownLinkIds }: BlastViewSources,
): BlastNodeView => {
  const standing = standingByPath.get(node.path) ?? "unreached"
  const importerPaths = blast.edges.filter((edge) => edge.imported === node.path).map((edge) => edge.importer)
  const importedPaths = blast.edges.filter((edge) => edge.importer === node.path).map((edge) => edge.imported)
  const fileAnchorId = fileAnchorIdByPath.get(node.path)
  return {
    id: node.path,
    x,
    y,
    radius,
    mark: MARKS[standing],
    markLabel: STANDING_LABELS[standing],
    label: labelByPath.get(node.path) ?? node.path,
    path: node.path,
    impactReason: node.impactReason === null ? null : parseProse(node.impactReason, knownLinkIds),
    impactNote: IMPACT_NOTES[standing] ?? null,
    importers: {
      heading: `Imported by ${countLabel(importerPaths.length, "file", "files")}`,
      emptyLabel: "No file of this segment imports it.",
      files: fileRowsOf(importerPaths),
    },
    imports: {
      heading: `Imports ${countLabel(importedPaths.length, "file", "files")}`,
      emptyLabel: "It imports no file of this segment.",
      files: fileRowsOf(importedPaths),
    },
    fileLink: fileAnchorId === undefined ? null : { anchorId: fileAnchorId, label: "Read it in the Code Walkthrough" },
  }
}

const toEdgeView = ({ edge, points }: PlacedBlastEdge): BlastEdgeView => ({
  id: `${edge.importer}>${edge.imported}`,
  importerId: edge.importer,
  importedId: edge.imported,
  points: [...points],
})

const summaryOf = ({ nodes, edges }: Blast, standings: readonly FileStanding[]): string[] => [
  countLabel(nodes.length, "file", "files"),
  `${String(nodes.filter((node) => node.diffType !== null).length)} changed`,
  countLabel(edges.length, "import", "imports"),
  ...IMPACT_SUMMARY_NOUNS.flatMap(([standing, singular, plural]) => {
    const count = standings.filter((candidate) => candidate === standing).length
    return count === 0 ? [] : [countLabel(count, singular, plural)]
  }),
]

export const buildBlast = (
  segment: Segment,
  scope: string,
  fileAnchorIdByPath: ReadonlyMap<string, string>,
  context: ReviewViewContext,
): BlastBand | null => {
  const { blast } = segment
  if (blast === null || blast.nodes.length === 0) return null
  const labelByPath = labelBlastFiles(blast.nodes.map((node) => node.path))
  const layout = layoutBlast(blast, labelByPath)
  const reachedPaths = listReachedPaths(blast)
  const standingByPath = new Map(blast.nodes.map((node) => [node.path, standingOf(node, reachedPaths)] as const))
  const standings = [...standingByPath.values()]
  const shownMarks = new Set(standings.map((standing) => MARKS[standing]))
  const sources: BlastViewSources = { blast, standingByPath, labelByPath, fileAnchorIdByPath, knownLinkIds: context.knownLinkIds }
  return {
    anchorId: `${scope}${BLAST_ANCHOR_NAME}`,
    heading: "Blast Diagram",
    summary: summaryOf(blast, standings),
    legend: LEGEND.filter((entry) => shownMarks.has(entry.mark)),
    edgeLegendLabel: "An arrow points at the file that is imported",
    board: {
      width: layout.width,
      height: layout.height,
      nodes: layout.nodes.map((placed) => toNodeView(placed, sources)),
      edges: layout.edges.map(toEdgeView),
    },
  }
}
