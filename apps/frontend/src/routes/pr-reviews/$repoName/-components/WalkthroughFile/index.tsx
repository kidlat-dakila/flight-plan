import { lazy, Suspense, useState, type ReactElement, type ReactNode } from "react"
import { useFileCode } from "@/routes/pr-reviews/$repoName/-hooks/use-file-code"
import CodeViewEditor, { type CodeViewWaypoint } from "@flightplan/ui/CodeViewEditor"
import type { WalkthroughWaypoint } from "@flightplan/ui/FileSection"
import IconButton from "@flightplan/ui/IconButton"
import type { CodeLinkTargets } from "@flightplan/ui/lib/review-content"
import type { CodeLinkRequest } from "@flightplan/ui/TextEditor"
import WaypointBox from "@flightplan/ui/WaypointBox"

const WaypointEditor = lazy(async () => await import("@/routes/pr-reviews/$repoName/-components/WaypointEditor"))

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

interface AuthoredWaypoint extends WalkthroughWaypoint {
  readonly lines: { readonly lineStart: number, readonly lineEnd: number } | null
  readonly text: { readonly title: string, readonly reading: string, readonly needsAttention: string | null }
}

type AuthoredRow
  = | { readonly kind: "lines" | "gap" }
    | { readonly kind: "waypoint", readonly waypoint: AuthoredWaypoint }

interface AuthoredFile {
  readonly anchorId: string
  readonly path: string
  readonly title: string
  readonly rows: readonly AuthoredRow[]
}

interface WalkthroughFileProps {
  readonly reviewKey: ReviewKey
  readonly segmentId: string
  readonly file: AuthoredFile
  readonly openWaypointIds: ReadonlySet<string>
  readonly currentWaypointId: string | null
  readonly isPending: boolean
  readonly codeLinks: CodeLinkTargets
  readonly renderCodeLinkDialog: (request: CodeLinkRequest) => ReactNode
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onToggleWaypoint: (waypointId: string) => void
  readonly onRemove: () => void
  readonly onRemoveWaypoint: (waypointId: string) => void
}

const EDITOR_LOADING_LABEL = "Loading the editor…"
const REMOVE_FILE_LABEL = "Remove the file from the walkthrough"
const EDIT_WAYPOINT_LABEL = "Edit the waypoint"
const REMOVE_WAYPOINT_LABEL = "Remove the waypoint"
const EDITOR_CLASSES = "my-1.5 mr-4 ml-18 rounded-md border border-foreground bg-background p-4 font-sans whitespace-normal"

const waypointsOf = (file: AuthoredFile): AuthoredWaypoint[] =>
  file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : []))

const toCodeViewWaypoint = (waypoint: AuthoredWaypoint): CodeViewWaypoint[] =>
  waypoint.lines === null
    ? []
    : [{ id: waypoint.id, title: waypoint.title, attentionLabel: waypoint.attentionLabel, ...waypoint.lines }]

const WalkthroughFile = ({
  reviewKey,
  segmentId,
  file,
  openWaypointIds,
  currentWaypointId,
  isPending,
  codeLinks,
  renderCodeLinkDialog,
  onOpenCodeLink,
  onToggleWaypoint,
  onRemove,
  onRemoveWaypoint,
}: WalkthroughFileProps) => {
  const [editedWaypointId, setEditedWaypointId] = useState<string | null>(null)
  const fileCode = useFileCode(reviewKey, file.path)
  const waypoints = waypointsOf(file)
  const lineLabels = new Set(fileCode.lines?.map((line) => line.numberLabel))
  const isInCode = (waypoint: AuthoredWaypoint): boolean => waypoint.lines !== null && lineLabels.has(String(waypoint.lines.lineEnd))
  const stopEditing = (): void => {
    setEditedWaypointId(null)
  }

  const renderWaypoint = (waypoint: AuthoredWaypoint): ReactElement => (waypoint.id === editedWaypointId
    ? (
        <div id={waypoint.anchorId} className={EDITOR_CLASSES}>
          <Suspense fallback={<p className="text-muted-foreground">{EDITOR_LOADING_LABEL}</p>}>
            <WaypointEditor
              reviewKey={reviewKey}
              segmentId={segmentId}
              waypointId={waypoint.id}
              legend={`${EDIT_WAYPOINT_LABEL}: ${waypoint.title}`}
              text={waypoint.text}
              renderCodeLinkDialog={renderCodeLinkDialog}
              onClose={stopEditing}
            />
          </Suspense>
        </div>
      )
    : (
        <WaypointBox
          waypoint={waypoint}
          isOpen={openWaypointIds.has(waypoint.id)}
          isCurrent={waypoint.id === currentWaypointId}
          isReviewPending={false}
          codeLinks={codeLinks}
          actions={(
            <>
              <IconButton icon="edit" label={`${EDIT_WAYPOINT_LABEL}: ${waypoint.title}`} onClick={() => { setEditedWaypointId(waypoint.id) }} />
              <IconButton
                icon="delete"
                label={`${REMOVE_WAYPOINT_LABEL}: ${waypoint.title}`}
                isDisabled={isPending}
                onClick={() => { onRemoveWaypoint(waypoint.id) }}
              />
            </>
          )}
          onOpenCodeLink={onOpenCodeLink}
          onToggle={() => { onToggleWaypoint(waypoint.id) }}
          onReviewedChange={null}
        />
      ))

  return (
    <article id={file.anchorId} aria-label={file.title} className="scroll-mt-(--waypoint-scroll-margin) pt-6">
      <div className="flex items-center gap-3 pb-2">
        <div className="flex min-w-0 flex-col justify-center">
          <h3 className="truncate text-[0.9375rem] leading-5 font-semibold">{file.title}</h3>
          <p className="truncate font-mono text-xs leading-4 text-muted-foreground" title={file.path}>{file.path}</p>
        </div>
        <span className="flex-1" />
        <IconButton icon="remove" label={`${REMOVE_FILE_LABEL}: ${file.path}`} isDisabled={isPending} onClick={onRemove} />
      </div>
      {fileCode.lines === null
        ? null
        : (
            <div className="bg-code empty:hidden">
              {waypoints.filter((waypoint) => !isInCode(waypoint)).map((waypoint) => (
                <div key={waypoint.id}>{renderWaypoint(waypoint)}</div>
              ))}
            </div>
          )}
      <CodeViewEditor
        path={file.path}
        lines={fileCode.lines}
        statusMessage={fileCode.statusMessage}
        waypoints={waypoints.flatMap(toCodeViewWaypoint)}
        waypointOptions="always-on"
        highlightButtonLabel={null}
        focusOn={null}
        renderWaypoint={({ id }) => waypoints.filter((waypoint) => waypoint.id === id).map(renderWaypoint)}
        onHighlightCode={null}
      />
    </article>
  )
}

export default WalkthroughFile
