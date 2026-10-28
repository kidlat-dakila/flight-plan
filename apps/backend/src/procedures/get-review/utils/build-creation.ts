import type { ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import type { LabelSegment } from "@/procedures/list-repositories/utils/schemas"
import type { DiffType } from "@flightplan/configurations"
import { buildFileExplorer } from "./build-file-explorer"
import { targetTitleOf } from "./build-shell"
import type { FileChange } from "./diff-stats"
import type { CreationArea, CreationFact, FileExplorer, ReviewCreation, ReviewHeader } from "./schemas"

export type BaseBranchOrigin = "pull-request" | "repository"

export interface DefaultBaseBranch {
  readonly branchName: string | null
  readonly origin: BaseBranchOrigin
}

export type ComparedChange
  = | { readonly kind: "read", readonly files: readonly FileChange[] }
    | { readonly kind: "problem", readonly message: string }

export interface CreationSource {
  readonly target: ReviewTarget
  readonly header: ReviewHeader
  readonly compareBranch: string | null
  readonly defaultBranch: DefaultBaseBranch
  readonly change: ComparedChange
}

interface Area {
  readonly name: string
  readonly isPath: boolean
  readonly fileCount: number
  readonly addedCount: number
  readonly removedCount: number
}

const LOCALE = "en-US"
const PATH_SEPARATOR = "/"
const PLACE_DEPTH = 2
const KEPT_AREA_COUNT = 4
const TOP_LEVEL_NAME = "Top-level files"
const AREAS_HEADING = "Where the lines are"
const NONE_LABEL = "None"
const PLUS_SIGN = "+"
const MINUS_SIGN = "−"
const CREATE_LABEL = "Create Review Artifact"
const CREATING_LABEL = "Creating the review artifact"

const NOTE_LABELS: Readonly<Record<BaseBranchOrigin, string>> = {
  "pull-request": "Pull request base",
  "repository": "Repository default",
}

const FILE_KIND_FACTS: readonly (readonly [string, DiffType])[] = [
  ["Added", "added"],
  ["Modified", "modified"],
  ["Deleted", "deleted"],
]

const formatCount = (count: number): string => count.toLocaleString(LOCALE)

const filesLabelOf = (count: number): string => `${formatCount(count)} ${count === 1 ? "file" : "files"}`

const addedLabelOf = (count: number): string => `${PLUS_SIGN}${formatCount(count)}`

const removedLabelOf = (count: number): string => `${MINUS_SIGN}${formatCount(count)}`

const plain = (text: string): LabelSegment => ({ text, kind: "plain" })

const code = (text: string): LabelSegment => ({ text, kind: "code" })

const headingOf = (target: ReviewTarget): string => `Create a new Flight Plan Review Artifact for “${targetTitleOf(target)}”`

const mergeClauseOf = (branchName: string | null): readonly LabelSegment[] =>
  branchName === null ? [] : [plain(" into "), code(branchName)]

const compareClauseOf = (branchName: string | null): readonly LabelSegment[] =>
  branchName === null ? [plain(".")] : [plain(" that are not on "), code(branchName), plain(".")]

const introductionOf = (source: CreationSource): LabelSegment[] => {
  const { target } = source
  if (target.kind === "branch") return [plain("Changes on "), code(target.name), ...compareClauseOf(source.compareBranch)]
  return [
    plain(`${target.author} wants to merge `),
    code(target.branch),
    ...mergeClauseOf(source.defaultBranch.branchName ?? source.compareBranch),
    plain(` in pull request #${String(target.number)}.`),
  ]
}

const noteLabelOf = ({ compareBranch, defaultBranch }: CreationSource): string | null =>
  compareBranch !== null && compareBranch === defaultBranch.branchName ? NOTE_LABELS[defaultBranch.origin] : null

const sumOf = (counts: readonly number[]): number => counts.reduce((total, count) => total + count, 0)

const quietFact = (label: string, size: CreationFact["size"]): CreationFact => ({ label, value: NONE_LABEL, tone: "quiet", size })

const lineFactOf = (label: string, count: number, tone: CreationFact["tone"], formatLines: (count: number) => string): CreationFact =>
  count === 0 ? quietFact(label, "large") : { label, value: formatLines(count), tone, size: "large" }

const fileKindFactOf = (files: readonly FileChange[], [label, kind]: readonly [string, DiffType]): CreationFact => {
  const count = files.filter((file) => file.kind === kind).length
  return count === 0 ? quietFact(label, "small") : { label, value: filesLabelOf(count), tone: "plain", size: "small" }
}

const factsOf = (files: readonly FileChange[]): CreationFact[] => [
  { label: "Files", value: formatCount(files.length), tone: "plain", size: "large" },
  lineFactOf("Lines added", sumOf(files.map((file) => file.addedCount)), "added", addedLabelOf),
  lineFactOf("Lines removed", sumOf(files.map((file) => file.removedCount)), "removed", removedLabelOf),
  ...FILE_KIND_FACTS.map((fact) => fileKindFactOf(files, fact)),
]

const placeOf = (path: string): string | null => {
  const folders = path.split(PATH_SEPARATOR).slice(0, -1)
  return folders.length === 0 ? null : folders.slice(0, PLACE_DEPTH).join(PATH_SEPARATOR)
}

const areaOfFile = (file: FileChange): Area => {
  const place = placeOf(file.path)
  return {
    name: place ?? TOP_LEVEL_NAME,
    isPath: place !== null,
    fileCount: 1,
    addedCount: file.addedCount,
    removedCount: file.removedCount,
  }
}

const mergedArea = (name: string, isPath: boolean, areas: readonly Area[]): Area => ({
  name,
  isPath,
  fileCount: sumOf(areas.map((area) => area.fileCount)),
  addedCount: sumOf(areas.map((area) => area.addedCount)),
  removedCount: sumOf(areas.map((area) => area.removedCount)),
})

const keyOf = (area: Area): string => `${String(area.isPath)}:${area.name}`

const withFileArea = (areas: ReadonlyMap<string, Area>, file: FileChange): ReadonlyMap<string, Area> => {
  const fileArea = areaOfFile(file)
  const key = keyOf(fileArea)
  const known = areas.get(key)
  return new Map([...areas, [key, known === undefined ? fileArea : mergedArea(fileArea.name, fileArea.isPath, [known, fileArea])]])
}

const lineCountOf = (area: Area): number => area.addedCount + area.removedCount

const byLinesThenName = (left: Area, right: Area): number =>
  lineCountOf(right) - lineCountOf(left) || left.name.localeCompare(right.name, LOCALE)

const morePlacesNameOf = (count: number): string => `${String(count)} more ${count === 1 ? "place" : "places"}`

const shownAreasOf = (files: readonly FileChange[]): readonly Area[] => {
  const sorted = [...files.reduce(withFileArea, new Map<string, Area>()).values()].sort(byLinesThenName)
  const kept = sorted.slice(0, KEPT_AREA_COUNT)
  const rest = sorted.slice(KEPT_AREA_COUNT)
  return rest.length === 0 ? kept : [...kept, mergedArea(morePlacesNameOf(rest.length), false, rest)]
}

const shareOf = (count: number, largestCount: number): number => (largestCount === 0 ? 0 : count / largestCount)

const toCreationArea = (area: Area, largestCount: number): CreationArea => ({
  name: area.name,
  isPath: area.isPath,
  fileCountLabel: filesLabelOf(area.fileCount),
  addedLabel: addedLabelOf(area.addedCount),
  removedLabel: removedLabelOf(area.removedCount),
  addedShare: shareOf(area.addedCount, largestCount),
  removedShare: shareOf(area.removedCount, largestCount),
})

const areaRowsOf = (files: readonly FileChange[]): CreationArea[] => {
  const areas = shownAreasOf(files)
  const largestCount = Math.max(0, ...areas.map(lineCountOf))
  return areas.map((area) => toCreationArea(area, largestCount))
}

const changedFilesOf = (change: ComparedChange): readonly FileChange[] => (change.kind === "read" ? change.files : [])

const authorOf = (header: ReviewHeader): ReviewCreation["author"] => (header.kind === "pull-request" ? header.author : null)

export const buildCreation = (source: CreationSource): ReviewCreation => {
  const files = changedFilesOf(source.change)
  return {
    heading: headingOf(source.target),
    author: authorOf(source.header),
    introduction: introductionOf(source),
    baseBranch: { branchName: source.compareBranch, noteLabel: noteLabelOf(source) },
    facts: source.change.kind === "read" ? factsOf(files) : [],
    areas: { heading: AREAS_HEADING, rows: areaRowsOf(files) },
    problem: source.change.kind === "problem" ? source.change.message : null,
    createLabel: CREATE_LABEL,
    creatingLabel: CREATING_LABEL,
  }
}

export const buildCreationExplorer = (change: ComparedChange): FileExplorer => {
  const files = changedFilesOf(change)
  return buildFileExplorer({
    changedPaths: files.map((file) => file.path),
    diffTypes: new Map(files.map((file) => [file.path, file.kind] as const)),
    summaries: null,
    anchorIdByPath: new Map(),
    filterValues: [],
  })
}
