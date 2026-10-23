import { WAYPOINT_MARK_LABELS, type WalkthroughFileSummary } from "@flightplan/codegraph"
import type { DiffType, ReviewArtifact, WaypointFilter } from "@flightplan/configurations"
import { countLabel } from "./count-label"
import { fileIconOf } from "./file-icon"
import type { FileExplorer, FileExplorerRow } from "./schemas"

export interface FileExplorerSource {
  readonly changedPaths: readonly string[]
  readonly diffTypes: ReadonlyMap<string, DiffType>
  readonly summaries: readonly WalkthroughFileSummary[]
  readonly anchorIdByPath: ReadonlyMap<string, string>
  readonly filterValues: readonly string[]
}

interface Folder {
  readonly folders: ReadonlyMap<string, Folder>
  readonly paths: readonly string[]
}

type FileRow = Extract<FileExplorerRow, { kind: "file" }>

const PATH_SEPARATOR = "/"
const EMPTY_FOLDER: Folder = { folders: new Map(), paths: [] }
const NOT_COVERED_LABEL = "Not covered"
const FILTER_LABEL = "Filtered by"
const CLEAR_FILTER_LABEL = "Clear"

const CHANGE_LABELS: Readonly<Record<DiffType, string>> = {
  added: "Added",
  modified: "Modified",
  deleted: "Deleted",
}

const compareNames = (left: string, right: string): number =>
  left.localeCompare(right, "en", { numeric: true, sensitivity: "base" })

const nameOf = (path: string): string => path.slice(path.lastIndexOf(PATH_SEPARATOR) + 1)

const withPath = (folder: Folder, segments: readonly string[], path: string): Folder => {
  const [head, ...rest] = segments
  if (rest.length === 0) return { ...folder, paths: [...folder.paths, path] }
  const child = folder.folders.get(head) ?? EMPTY_FOLDER
  return { ...folder, folders: new Map([...folder.folders, [head, withPath(child, rest, path)]]) }
}

const folderOf = (paths: readonly string[]): Folder =>
  paths.reduce((folder, path) => withPath(folder, path.split(PATH_SEPARATOR), path), EMPTY_FOLDER)

const compacted = (name: string, folder: Folder): readonly [string, Folder] => {
  const [onlyChild] = folder.folders
  return folder.paths.length === 0 && folder.folders.size === 1
    ? compacted(`${name}${PATH_SEPARATOR}${onlyChild[0]}`, onlyChild[1])
    : [name, folder]
}

interface RowPlace {
  readonly parentId: string
  readonly depth: number
  readonly ancestorIds: readonly string[]
}

type FileRowBuilder = (path: string, place: RowPlace) => FileRow

const childIdOf = (parentId: string, name: string): string => (parentId === "" ? name : `${parentId}${PATH_SEPARATOR}${name}`)

const rowsOf = (folder: Folder, place: RowPlace, toFileRow: FileRowBuilder): FileExplorerRow[] => {
  const folders = [...folder.folders]
    .map(([name, child]) => compacted(name, child))
    .sort(([left], [right]) => compareNames(left, right))
  const paths = [...folder.paths].sort((left, right) => compareNames(nameOf(left), nameOf(right)))
  return [
    ...folders.flatMap(([name, child]): FileExplorerRow[] => {
      const id = childIdOf(place.parentId, name)
      const childPlace = { parentId: id, depth: place.depth + 1, ancestorIds: [...place.ancestorIds, id] }
      return [{ kind: "folder", id, name, depth: place.depth, ancestorIds: [...place.ancestorIds] }, ...rowsOf(child, childPlace, toFileRow)]
    }),
    ...paths.map((path) => toFileRow(path, place)),
  ]
}

const reviewedOf = (summary: WalkthroughFileSummary): FileRow["reviewed"] =>
  summary.waypointCount === 0
    ? null
    : {
        count: summary.reviewedCount,
        total: summary.waypointCount,
        label: `${String(summary.reviewedCount)} of ${countLabel(summary.waypointCount, "waypoint", "waypoints")} reviewed`,
      }

const matchOf = (summary: WalkthroughFileSummary, isFiltered: boolean): FileRow["match"] =>
  isFiltered
    ? { count: summary.matchCount, label: countLabel(summary.matchCount, "waypoint matches the filter", "waypoints match the filter") }
    : null

const fileRowBuilderOf = (source: FileExplorerSource, summaryByPath: ReadonlyMap<string, WalkthroughFileSummary>): FileRowBuilder => {
  const isFiltered = source.filterValues.length > 0
  return (path, { depth, ancestorIds }) => {
    const summary = summaryByPath.get(path) ?? null
    const diffType = source.diffTypes.get(path) ?? null
    return {
      kind: "file",
      id: path,
      name: nameOf(path),
      depth,
      ancestorIds: [...ancestorIds],
      icon: fileIconOf(path),
      change: diffType === null ? null : { kind: diffType, label: CHANGE_LABELS[diffType] },
      anchorId: source.anchorIdByPath.get(path) ?? null,
      noteLabel: summary === null ? NOT_COVERED_LABEL : null,
      marks: summary === null ? [] : summary.markKinds.map((kind) => ({ kind, label: WAYPOINT_MARK_LABELS[kind] })),
      reviewed: summary === null ? null : reviewedOf(summary),
      match: summary === null ? null : matchOf(summary, isFiltered),
    }
  }
}

const summaryLabelsOf = (totalCount: number, hiddenCount: number, notCoveredCount: number): string[] => [
  hiddenCount === 0
    ? countLabel(totalCount, "file", "files")
    : `${String(totalCount - hiddenCount)} of ${countLabel(totalCount, "file", "files")}`,
  ...(notCoveredCount === 0 ? [] : [`${String(notCoveredCount)} not in the walkthrough`]),
]

const hiddenLabelOf = (hiddenCount: number, isFiltered: boolean): string | null => {
  if (hiddenCount === 0) return null
  return isFiltered
    ? `${countLabel(hiddenCount, "file", "files")} hidden by the filter`
    : `${countLabel(hiddenCount, "reviewed file", "reviewed files")} hidden`
}

export const buildFileExplorer = (source: FileExplorerSource): FileExplorer => {
  const summaryByPath = new Map(source.summaries.map((summary) => [summary.path, summary] as const))
  const isHidden = (path: string): boolean => summaryByPath.get(path)?.isShown === false
  const shownPaths = source.changedPaths.filter((path) => !isHidden(path))
  const hiddenCount = source.changedPaths.length - shownPaths.length
  const notCoveredCount = source.changedPaths.filter((path) => !summaryByPath.has(path)).length
  const isFiltered = source.filterValues.length > 0
  return {
    summary: summaryLabelsOf(source.changedPaths.length, hiddenCount, notCoveredCount),
    filter: isFiltered ? { label: FILTER_LABEL, values: [...source.filterValues], clearLabel: CLEAR_FILTER_LABEL } : null,
    hiddenLabel: hiddenLabelOf(hiddenCount, isFiltered),
    rows: rowsOf(folderOf(shownPaths), { parentId: "", depth: 0, ancestorIds: [] }, fileRowBuilderOf(source, summaryByPath)),
  }
}

const diffTypedPathsOf = (artifact: ReviewArtifact): readonly (readonly [string, DiffType])[] =>
  artifact.segments
    .flatMap((segment) => [segment.blastDiagram, segment.hiddenBlastDiagram ?? null])
    .flatMap((blast) => (blast === null ? [] : [...blast.nodes, ...(blast.importBound?.nodes ?? [])]))
    .flatMap((node) => (node.diffType === null ? [] : [[node.path, node.diffType] as const]))

export const diffTypesOf = (artifact: ReviewArtifact): ReadonlyMap<string, DiffType> => new Map(diffTypedPathsOf(artifact))

export const selectedFilterLabelsOf = (filter: WaypointFilter): string[] => {
  const options = [
    ...filter.groups.flatMap((group) => [...group.options, ...(group.more?.options ?? [])]),
    ...filter.submenus.flatMap((submenu) => submenu.options),
  ]
  return [...new Set(options.filter((option) => option.isSelected).map((option) => option.label))]
}
