import { Link } from "@tanstack/react-router"
import Avatar from "@flightplan/ui/Avatar"
import LabelSegments, { type LabelSegment } from "@flightplan/ui/LabelSegments"
import StopRing, { STATUS_LABEL_CLASSES, type StopStatus } from "@flightplan/ui/StopRing"

interface StopAuthor {
  readonly name: string
  readonly avatarUrl: string | null
  readonly monogram: string
}

interface ReviewTargetStopProps {
  readonly title: LabelSegment
  readonly details: readonly LabelSegment[]
  readonly author: StopAuthor | null
  readonly repositoryName: string
  readonly targetId: string
  readonly branchStatus: StopStatus
  readonly statusLabel: string
  readonly updatedLabel: string
}

const ROW_FILL_CLASSES = "before:absolute before:-inset-x-3 before:inset-y-0 before:-z-10 before:rounded-sm before:transition-colors before:duration-[180ms] before:ease-out hover:before:bg-muted"

const ReviewTargetStop = ({
  title,
  details,
  author,
  repositoryName,
  targetId,
  branchStatus,
  statusLabel,
  updatedLabel,
}: ReviewTargetStopProps) => (
  <li className={`group relative isolate grid grid-cols-[2.5rem_minmax(0,1fr)] ${ROW_FILL_CLASSES}`}>
    <span aria-hidden="true" className="flex flex-col items-center">
      <span className="h-3 w-1 bg-(--line)" />
      <StopRing status={branchStatus} />
      <span className="w-1 flex-1 bg-(--line) group-last:invisible" />
    </span>
    <Link
      to="/pr-reviews/$repoName/$branchId"
      params={{ repoName: repositoryName, branchId: targetId }}
      className="grid gap-x-4 gap-y-0.5 py-2.5 outline-none after:absolute after:-inset-x-3 after:inset-y-0 after:rounded-sm focus-visible:after:outline-2 focus-visible:after:outline-ring sm:grid-cols-[minmax(0,1fr)_8rem_8rem_7.5rem] sm:items-baseline"
    >
      <span className="min-w-0">
        <LabelSegments segments={[title]} className="leading-6" />
        <LabelSegments segments={details} className="text-sm text-muted-foreground" />
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:contents">
        {author === null
          ? <span className="hidden sm:block" />
          : (
              <span className="flex min-w-0 items-center gap-2 sm:h-6 sm:self-start">
                <Avatar imageUrl={author.avatarUrl} monogram={author.monogram} />
                <span className="truncate">{author.name}</span>
              </span>
            )}
        <span className={STATUS_LABEL_CLASSES[branchStatus]}>{statusLabel}</span>
        <span className="text-muted-foreground tabular-nums sm:text-right">{updatedLabel}</span>
      </span>
    </Link>
  </li>
)

export default ReviewTargetStop
