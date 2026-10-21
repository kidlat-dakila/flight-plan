import { lazy, Suspense, useState, type ReactNode } from "react"
import type { WaypointText } from "@/routes/pr-reviews/$repoName/-hooks/use-waypoint-editing"
import type { WaypointAuthoring } from "@flightplan/ui/FileRows"
import IconButton from "@flightplan/ui/IconButton"
import type { CodeLinkRequest } from "@flightplan/ui/TextEditor"

const WaypointEditor = lazy(async () => await import("@/routes/pr-reviews/$repoName/-components/WaypointEditor"))

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface AuthoredWaypoint {
  readonly id: string
  readonly anchorId: string
  readonly title: string
  readonly text: WaypointText
}

type AuthoredRow
  = | { readonly kind: "waypoint", readonly waypoint: AuthoredWaypoint }
    | { readonly kind: "lines" | "gap" }

interface AuthoredFile {
  readonly path: string
  readonly rows: readonly AuthoredRow[]
}

interface AuthoringOptions {
  readonly isPending: boolean
  readonly renderCodeLinkDialog: (request: CodeLinkRequest) => ReactNode
  readonly onRemoveFile: (segmentId: string, path: string) => void
  readonly onRemoveWaypoint: (segmentId: string, waypointId: string) => void
}

export interface WaypointAuthorings {
  readonly onWriteDescription: (waypointId: string) => void
  readonly authoringOf: (segmentId: string, file: AuthoredFile) => WaypointAuthoring
  readonly headerActionsOf: (segmentId: string, file: AuthoredFile) => ReactNode
}

const EDITOR_LOADING_LABEL = "Loading the editor…"
const REMOVE_FILE_LABEL = "Remove the file from the walkthrough"
const EDIT_WAYPOINT_LABEL = "Edit the waypoint"
const REMOVE_WAYPOINT_LABEL = "Remove the waypoint"
const EDITOR_CLASSES = "my-1.5 mr-4 ml-28 rounded-md border border-foreground bg-background p-4 font-sans whitespace-normal"

const waypointOf = (file: AuthoredFile, waypointId: string): AuthoredWaypoint | null =>
  file.rows.flatMap((row) => (row.kind === "waypoint" && row.waypoint.id === waypointId ? [row.waypoint] : [])).at(0) ?? null

export const useWaypointAuthoring = (reviewKey: ReviewKey, options: AuthoringOptions): WaypointAuthorings => {
  const [editedWaypointId, setEditedWaypointId] = useState<string | null>(null)
  const stopEditing = (): void => {
    setEditedWaypointId(null)
  }

  const renderEditor = (segmentId: string, waypoint: AuthoredWaypoint): ReactNode => (
    <div id={waypoint.anchorId} className={EDITOR_CLASSES}>
      <Suspense fallback={<p className="text-muted-foreground">{EDITOR_LOADING_LABEL}</p>}>
        <WaypointEditor
          reviewKey={reviewKey}
          segmentId={segmentId}
          waypointId={waypoint.id}
          legend={`${EDIT_WAYPOINT_LABEL}: ${waypoint.title}`}
          text={waypoint.text}
          renderCodeLinkDialog={options.renderCodeLinkDialog}
          onClose={stopEditing}
        />
      </Suspense>
    </div>
  )

  const renderActions = (segmentId: string, waypoint: AuthoredWaypoint): ReactNode => (
    <>
      <IconButton icon="edit" label={`${EDIT_WAYPOINT_LABEL}: ${waypoint.title}`} onClick={() => { setEditedWaypointId(waypoint.id) }} />
      <IconButton
        icon="delete"
        label={`${REMOVE_WAYPOINT_LABEL}: ${waypoint.title}`}
        isDisabled={options.isPending}
        onClick={() => { options.onRemoveWaypoint(segmentId, waypoint.id) }}
      />
    </>
  )

  return {
    onWriteDescription: setEditedWaypointId,
    authoringOf: (segmentId, file) => ({
      editedWaypointId,
      renderEditor: (waypointId): ReactNode => {
        const waypoint = waypointOf(file, waypointId)
        return waypoint === null ? null : renderEditor(segmentId, waypoint)
      },
      renderActions: (waypointId): ReactNode => {
        const waypoint = waypointOf(file, waypointId)
        return waypoint === null ? null : renderActions(segmentId, waypoint)
      },
      onWriteDescription: setEditedWaypointId,
    }),
    headerActionsOf: (segmentId, file) => (
      <IconButton
        icon="remove"
        label={`${REMOVE_FILE_LABEL}: ${file.path}`}
        isDisabled={options.isPending}
        onClick={() => { options.onRemoveFile(segmentId, file.path) }}
      />
    ),
  }
}
