import { ChevronDownIcon, FolderIcon, FolderOpenIcon } from "lucide-react"
import { useState, type CSSProperties, type MouseEvent } from "react"
import Tooltip, { TooltipContent, TooltipTrigger } from "@/components/blocks/tooltip"
import DockedPanel from "@/components/DockedPanel"
import FileIcon, { type FileChangeKind, type FileIconKind } from "@/components/FileIcon"
import FindingMark, { type FindingMarkKind } from "@/components/FindingMark"
import { TooltipKeycap } from "@/components/IconButton"
import WaypointFilterMenu, { type WaypointFilterNavigation } from "@/components/WaypointFilterMenu"
import { cn } from "@/lib/utils"

interface ExplorerPlace {
  readonly id: string
  readonly name: string
  readonly depth: number
  readonly ancestorIds: readonly string[]
}

export interface ExplorerFolderRow extends ExplorerPlace {
  readonly kind: "folder"
}

export interface ExplorerFileRow extends ExplorerPlace {
  readonly kind: "file"
  readonly icon: { readonly kind: FileIconKind, readonly label: string }
  readonly change: { readonly kind: FileChangeKind, readonly label: string } | null
  readonly anchorId: string | null
  readonly noteLabel: string | null
  readonly marks: readonly { readonly kind: FindingMarkKind, readonly label: string }[]
  readonly reviewed: { readonly count: number, readonly total: number, readonly label: string } | null
  readonly match: { readonly count: number, readonly label: string } | null
}

export type ExplorerRow = ExplorerFolderRow | ExplorerFileRow

export interface FileExplorerView {
  readonly summary: readonly string[]
  readonly filter: { readonly label: string, readonly values: readonly string[], readonly clearLabel: string } | null
  readonly hiddenLabel: string | null
  readonly rows: readonly ExplorerRow[]
}

interface PanelLabels {
  readonly label: string
  readonly hideLabel: string
  readonly showLabel: string
}

interface FileExplorerProps {
  readonly labels: PanelLabels
  readonly shortcutLabel: string
  readonly explorer: FileExplorerView
  readonly currentAnchorId: string | null
  readonly filterNavigation: WaypointFilterNavigation | null
  readonly onOpenFile: (anchorId: string) => void
  readonly onHide: () => void
  readonly onClearFilter: () => void
}

interface FileExplorerStripProps {
  readonly labels: PanelLabels
  readonly shortcutLabel: string
  readonly onShow: () => void
}

const SEPARATOR = " • "
const INDENT_REM = 0.875
const ROW_INSET_REM = 0.5
const NO_FOLDERS: ReadonlySet<string> = new Set()
const PERCENT = 100

const ROW_CLASSES = "relative grid min-h-7 w-full items-center gap-1.5 rounded-sm pr-2 text-left text-[0.8125rem] leading-5 transition-colors duration-[180ms] ease-out"
const FILE_COLUMNS = "grid-cols-[1rem_1rem_minmax(0,1fr)_auto_2.25rem]"
const FOLDER_COLUMNS = "grid-cols-[1rem_1rem_minmax(0,1fr)]"

export const visibleRowsOf = (rows: readonly ExplorerRow[], closedFolderIds: ReadonlySet<string>): ExplorerRow[] =>
  rows.filter((row) => !row.ancestorIds.some((id) => closedFolderIds.has(id)))

const withToggled = (ids: ReadonlySet<string>, id: string): ReadonlySet<string> =>
  ids.has(id) ? new Set([...ids].filter((openId) => openId !== id)) : new Set([...ids, id])

const indentOf = (depth: number): CSSProperties => ({ paddingLeft: `${String(ROW_INSET_REM + depth * INDENT_REM)}rem` })

const reviewedShareOf = ({ count, total }: NonNullable<ExplorerFileRow["reviewed"]>): string => `${String((count / total) * PERCENT)}%`

const ReviewedMeter = ({ reviewed }: { readonly reviewed: ExplorerFileRow["reviewed"] }) =>
  reviewed === null
    ? <span />
    : (
        <span role="img" aria-label={reviewed.label} title={reviewed.label} className="h-1 w-9 justify-self-end overflow-hidden rounded-[1px] bg-muted">
          <span className="block h-full bg-line-blue transition-[width] duration-[180ms] ease-out" style={{ width: reviewedShareOf(reviewed) }} />
        </span>
      )

const FileMarks = ({ row }: { readonly row: ExplorerFileRow }) => {
  if (row.noteLabel !== null) return <span className="text-xs text-muted-foreground">{row.noteLabel}</span>
  if (row.match !== null) {
    return (
      <span title={row.match.label} className="rounded-full bg-(--line) px-1.5 font-mono text-[0.6875rem] leading-[1.1rem] font-bold text-line-foreground tabular-nums">
        <span aria-hidden="true">{row.match.count}</span>
        <span className="sr-only">{row.match.label}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-[0.1875rem]">
      {row.marks.map((mark) => (
        <span key={mark.kind} title={mark.label} className="inline-flex">
          <FindingMark kind={mark.kind} className="size-[0.8125rem]" />
          <span className="sr-only">{mark.label}</span>
        </span>
      ))}
    </span>
  )
}

const FileRowContent = ({ row }: { readonly row: ExplorerFileRow }) => (
  <>
    <span aria-hidden="true" />
    <FileIcon kind={row.icon.kind} change={row.change} />
    <span className={cn("truncate font-mono text-[0.78rem]", row.change?.kind === "deleted" && "line-through decoration-1")}>
      {row.name}
      <span className="sr-only">{[row.icon.label, row.change?.label].filter((label) => label !== undefined).join(SEPARATOR)}</span>
    </span>
    <FileMarks row={row} />
    <ReviewedMeter reviewed={row.reviewed} />
  </>
)

interface FileRowProps {
  readonly row: ExplorerFileRow
  readonly isCurrent: boolean
  readonly onOpen: (anchorId: string) => void
}

const isPlainClick = (event: MouseEvent<HTMLAnchorElement>): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

const FileRow = ({ row, isCurrent, onOpen }: FileRowProps) =>
  row.anchorId === null
    ? (
        <div data-file-row={row.id} className={cn(ROW_CLASSES, FILE_COLUMNS, "text-muted-foreground")} style={indentOf(row.depth)}>
          <FileRowContent row={row} />
        </div>
      )
    : (
        <a
          href={`#${row.anchorId}`}
          data-file-row={row.id}
          data-user-action-id="explorer-file-action"
          aria-current={isCurrent ? "location" : undefined}
          className={cn(ROW_CLASSES, FILE_COLUMNS, "hover:bg-muted aria-[current]:bg-muted aria-[current]:font-bold aria-[current]:text-primary-text")}
          style={indentOf(row.depth)}
          onClick={(event) => {
            if (row.anchorId === null || !isPlainClick(event)) return
            event.preventDefault()
            onOpen(row.anchorId)
          }}
        >
          <FileRowContent row={row} />
        </a>
      )

interface FolderRowProps {
  readonly row: ExplorerFolderRow
  readonly isOpen: boolean
  readonly onToggle: () => void
}

const FolderRow = ({ row, isOpen, onToggle }: FolderRowProps) => (
  <button
    type="button"
    aria-expanded={isOpen}
    data-user-action-id="explorer-folder-action"
    className={cn(ROW_CLASSES, FOLDER_COLUMNS, "cursor-pointer text-muted-foreground hover:bg-muted")}
    style={indentOf(row.depth)}
    onClick={onToggle}
  >
    <ChevronDownIcon aria-hidden="true" className={cn("size-3.5 justify-self-center transition-transform duration-[180ms] ease-out", !isOpen && "-rotate-90")} />
    {isOpen
      ? <FolderOpenIcon aria-hidden="true" data-folder-icon="open" className="size-[0.9375rem]" />
      : <FolderIcon aria-hidden="true" data-folder-icon="closed" className="size-[0.9375rem]" />}
    <span className="truncate font-mono text-xs">{row.name}</span>
  </button>
)

const FilterNote = ({ filter, onClear }: { readonly filter: NonNullable<FileExplorerView["filter"]>, readonly onClear: () => void }) => (
  <p className="flex items-baseline gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
    <span className="min-w-0 flex-1">
      {filter.label}
      {" "}
      {filter.values.map((value, index) => (
        <span key={value}>
          {index === 0 ? null : ", "}
          <span className="font-bold text-foreground">{value}</span>
        </span>
      ))}
    </span>
    <button type="button" className="cursor-pointer text-foreground underline underline-offset-[3px] hover:text-primary-text" onClick={onClear}>
      {filter.clearLabel}
    </button>
  </p>
)

const FileExplorer = ({ labels, shortcutLabel, explorer, currentAnchorId, filterNavigation, onOpenFile, onHide, onClearFilter }: FileExplorerProps) => {
  const [closedFolderIds, setClosedFolderIds] = useState(NO_FOLDERS)
  return (
    <DockedPanel
      heading={labels.label}
      detail={<p className="text-xs text-muted-foreground tabular-nums">{explorer.summary.join(SEPARATOR)}</p>}
      actions={filterNavigation === null ? null : <WaypointFilterMenu navigation={filterNavigation} />}
      side="left"
      hideLabel={labels.hideLabel}
      shortcutLabel={shortcutLabel}
      onHide={onHide}
    >
      {explorer.filter === null ? null : <FilterNote filter={explorer.filter} onClear={onClearFilter} />}
      <div className="flex flex-col px-2 pt-1.5 pb-4">
        {visibleRowsOf(explorer.rows, closedFolderIds).map((row) =>
          row.kind === "folder"
            ? (
                <FolderRow
                  key={row.id}
                  row={row}
                  isOpen={!closedFolderIds.has(row.id)}
                  onToggle={() => { setClosedFolderIds((ids) => withToggled(ids, row.id)) }}
                />
              )
            : <FileRow key={row.id} row={row} isCurrent={row.anchorId !== null && row.anchorId === currentAnchorId} onOpen={onOpenFile} />)}
        {explorer.hiddenLabel === null
          ? null
          : <p className="mt-2 border-t px-2 pt-2.5 text-xs text-muted-foreground">{explorer.hiddenLabel}</p>}
      </div>
    </DockedPanel>
  )
}

export const FileExplorerStrip = ({ labels, shortcutLabel, onShow }: FileExplorerStripProps) => (
  <div className="flex h-full flex-col items-center gap-3 pt-3">
    <Tooltip>
      <TooltipTrigger
        render={(
          <button
            type="button"
            aria-label={labels.showLabel}
            data-user-action-id="explorer-show-action"
            className="grid size-7 cursor-pointer place-items-center rounded-[0.3rem] text-muted-foreground transition-colors duration-[180ms] ease-out hover:bg-muted hover:text-foreground"
            onClick={onShow}
          />
        )}
      >
        <FolderIcon aria-hidden="true" className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="right">
        {labels.showLabel}
        <TooltipKeycap label={shortcutLabel} />
      </TooltipContent>
    </Tooltip>
    <span aria-hidden="true" className="rotate-180 text-xs whitespace-nowrap text-muted-foreground [writing-mode:vertical-rl]">{labels.label}</span>
  </div>
)

export default FileExplorer
