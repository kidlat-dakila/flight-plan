import { countLabel } from "@/prose/count-label"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import type { Blast, BlastBand, BlastEdgeView, BlastFileMark, BlastNode, BlastNodeView, BlastView, ImportBound, Segment } from "@flightplan/configurations"
import { isChangedFile, listReachedPaths } from "./assessment"
import { layoutBlast, type PlacedBlastEdge, type PlacedBlastNode } from "./layout"

export const BLAST_ANCHOR_NAME = "blast-diagram"
const PATH_SEPARATOR = "/"
const EXTENSION_SEPARATOR = "."
const FOLDER_ENTRY_NAMES: readonly string[] = ["index", "__init__", "mod", "main"]
const FILE_NAME_SEGMENT_COUNT = 1
const FOLDER_ENTRY_SEGMENT_COUNT = 2

type FileStanding = NonNullable<BlastNode["diffType"]> | NonNullable<BlastNode["impactType"]> | "unassessed" | "unreached" | "used"

const STANDING_LABELS: Readonly<Record<FileStanding, string>> = {
  "added": "Added",
  "modified": "Modified",
  "deleted": "Deleted",
  "breaks": "Breaks",
  "behaviour-changes": "Behaviour changes",
  "unaffected": "Unaffected",
  "unassessed": "Not assessed",
  "unreached": "Not reached by the change",
  "used": "Used by the change",
}

const IMPACT_NOTES: Readonly<Partial<Record<FileStanding, string>>> = {
  unaffected: "The change reaches this file, and nothing it does is different.",
  unassessed: "Nobody has assessed what the change does to this file.",
  unreached: "The change cannot reach this file.",
  used: "The change uses this file. Nothing the change does can affect it.",
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
  "used": "plain",
}

const CHANGE_LEGEND: BlastView["legend"] = [
  { mark: "added", label: "Added file" },
  { mark: "modified", label: "Modified file" },
  { mark: "deleted", label: "Deleted file" },
]

const EXPORT_BOUND_LEGEND: BlastView["legend"] = [
  ...CHANGE_LEGEND,
  { mark: "breaks", label: "Breaks" },
  { mark: "behaviour-changes", label: "Behaviour changes" },
  { mark: "plain", label: "File the change did not touch" },
]

const IMPORT_BOUND_LEGEND: BlastView["legend"] = [...CHANGE_LEGEND, { mark: "plain", label: "File the change uses" }]

const EDGE_LEGEND_LABEL = "An arrow points at the file that is imported"
const NO_IMPACT_TYPE = { impactType: null, impactReason: null }

const IMPACT_SUMMARY_NOUNS: readonly (readonly [FileStanding, string, string])[] = [
  ["breaks", "breaks", "break"],
  ["behaviour-changes", "changes behaviour", "change behaviour"],
  ["unaffected", "unaffected", "unaffected"],
  ["unassessed", "not assessed", "not assessed"],
  ["used", "used by the change", "used by the change"],
]

const ASSESSMENT_FORM: BlastBand["assessmentForm"] = {
  editLabel: "Edit impact",
  impactTypeLabel: "Impact",
  impactReasonLabel: "Reason",
  choices: [
    { value: "unassessed", label: STANDING_LABELS.unassessed, hasReason: false },
    { value: "breaks", label: STANDING_LABELS.breaks, hasReason: true },
    { value: "behaviour-changes", label: STANDING_LABELS["behaviour-changes"], hasReason: true },
    { value: "unaffected", label: STANDING_LABELS.unaffected, hasReason: false },
  ],
}

const standingOf = (node: BlastNode, reachedPaths: ReadonlySet<string>): FileStanding => {
  if (node.diffType !== null) return node.diffType
  if (node.impactType !== null) return node.impactType
  return reachedPaths.has(node.path) ? "unassessed" : "unreached"
}

const assessmentOf = (node: BlastNode, standing: FileStanding): BlastNodeView["assessment"] =>
  isChangedFile(node) || standing === "unreached" || standing === "used"
    ? null
    : { impactType: node.impactType ?? "unassessed", impactReason: node.impactReason ?? "" }

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
  readonly blastDiagram: Blast
  readonly standingByPath: ReadonlyMap<string, FileStanding>
  readonly labelByPath: ReadonlyMap<string, string>
  readonly fileAnchorIdByPath: ReadonlyMap<string, string>
  readonly knownLinkIds: ReadonlySet<string>
  readonly isWriting: boolean
}

const toNodeView = (
  { node, x, y, radius }: PlacedBlastNode,
  { blastDiagram, standingByPath, labelByPath, fileAnchorIdByPath, knownLinkIds, isWriting }: BlastViewSources,
): BlastNodeView => {
  const standing = standingByPath.get(node.path) ?? "unreached"
  const importerPaths = blastDiagram.edges.filter((edge) => edge.imported === node.path).map((edge) => edge.importer)
  const importedPaths = blastDiagram.edges.filter((edge) => edge.importer === node.path).map((edge) => edge.imported)
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
    isUnassessed: standing === "unassessed",
    isBeingWritten: isWriting && node.isRequired && node.impactType === null && !isChangedFile(node),
    assessment: assessmentOf(node, standing),
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

interface ViewWording {
  readonly id: BlastView["id"]
  readonly label: string
  readonly description: string
  readonly legend: BlastView["legend"]
}

const EXPORT_BOUND: ViewWording = {
  id: "export-bound",
  label: "Export bound",
  description: "Export bound: the files that use what the change changed",
  legend: EXPORT_BOUND_LEGEND,
}

const IMPORT_BOUND: ViewWording = {
  id: "import-bound",
  label: "Import bound",
  description: "Import bound: the files the change uses",
  legend: IMPORT_BOUND_LEGEND,
}

interface ViewSources {
  readonly blastDiagram: Blast
  readonly standingByPath: ReadonlyMap<string, FileStanding>
  readonly fileAnchorIdByPath: ReadonlyMap<string, string>
  readonly knownLinkIds: ReadonlySet<string>
  readonly isWriting: boolean
}

const buildView = ({ id, label, description, legend }: ViewWording, { blastDiagram, standingByPath, fileAnchorIdByPath, knownLinkIds, isWriting }: ViewSources): BlastView => {
  const labelByPath = labelBlastFiles(blastDiagram.nodes.map((node) => node.path))
  const layout = layoutBlast(blastDiagram, labelByPath)
  const standings = [...standingByPath.values()]
  const shownMarks = new Set(standings.map((standing) => MARKS[standing]))
  const sources: BlastViewSources = { blastDiagram, standingByPath, labelByPath, fileAnchorIdByPath, knownLinkIds, isWriting }
  return {
    id,
    label,
    description,
    summary: summaryOf(blastDiagram, standings),
    legend: legend.filter((entry) => shownMarks.has(entry.mark)),
    edgeLegendLabel: EDGE_LEGEND_LABEL,
    board: {
      width: layout.width,
      height: layout.height,
      nodes: layout.nodes.map((placed) => toNodeView(placed, sources)),
      edges: layout.edges.map(toEdgeView),
    },
  }
}

const exportBoundStandings = (blastDiagram: Blast): ReadonlyMap<string, FileStanding> => {
  const reachedPaths = listReachedPaths(blastDiagram)
  return new Map(blastDiagram.nodes.map((node) => [node.path, standingOf(node, reachedPaths)] as const))
}

const blastOfImportBound = ({ nodes, edges }: ImportBound): Blast => ({ nodes: nodes.map((node) => ({ ...node, ...NO_IMPACT_TYPE, isRequired: false })), edges: [...edges] })

const importBoundStandings = (blastDiagram: Blast): ReadonlyMap<string, FileStanding> =>
  new Map(blastDiagram.nodes.map((node) => [node.path, node.diffType ?? "used"] as const))

export const buildBlast = (
  segment: Segment,
  scope: string,
  fileAnchorIdByPath: ReadonlyMap<string, string>,
  context: ReviewViewContext,
): BlastBand | null => {
  const { blastDiagram } = segment
  if (blastDiagram === null || blastDiagram.nodes.length === 0) return null
  const shared = { fileAnchorIdByPath, knownLinkIds: context.knownLinkIds, isWriting: context.isWriting }
  const used = blastDiagram.importBound === undefined ? null : blastOfImportBound(blastDiagram.importBound)
  const isUsedByNothing = blastDiagram.nodes.every((node) => segment.changedPaths.includes(node.path))
  return {
    anchorId: `${scope}${BLAST_ANCHOR_NAME}`,
    heading: "Blast Diagram",
    defaultViewId: used !== null && isUsedByNothing ? IMPORT_BOUND.id : EXPORT_BOUND.id,
    assessmentForm: ASSESSMENT_FORM,
    views: [
      buildView(EXPORT_BOUND, { ...shared, blastDiagram, standingByPath: exportBoundStandings(blastDiagram) }),
      ...(used === null ? [] : [buildView(IMPORT_BOUND, { ...shared, blastDiagram: used, standingByPath: importBoundStandings(used) })]),
    ],
  }
}
