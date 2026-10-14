import { useId } from "react"
import NewTargetPrompt from "@/routes/-components/NewTargetPrompt"
import ReviewTargetStop from "@/routes/-components/ReviewTargetStop"
import Button, { buttonVariants } from "@flightplan/ui/blocks/button"
import IconButton from "@flightplan/ui/IconButton"
import LabelSegments, { type LabelSegment } from "@flightplan/ui/LabelSegments"
import { LINE_COLOR_CLASSES, type LineColor } from "@flightplan/ui/lib/line-color"
import { cn } from "@flightplan/ui/lib/utils"
import LineRoundel from "@flightplan/ui/LineRoundel"
import type { StopStatus } from "@flightplan/ui/StopRing"

interface ReviewTarget {
  readonly id: string
  readonly title: LabelSegment
  readonly details: readonly LabelSegment[]
  readonly author: { readonly name: string, readonly avatarUrl: string | null, readonly monogram: string } | null
  readonly href: string
  readonly branchStatus: StopStatus
  readonly statusLabel: string
  readonly updatedLabel: string
}

type LineContent
  = | { readonly kind: "targets", readonly targets: readonly ReviewTarget[] }
    | { readonly kind: "empty", readonly message: string }
    | { readonly kind: "no-branches", readonly message: string, readonly detail: string, readonly actionLabel: string }
    | {
      readonly kind: "problem"
      readonly message: string
      readonly detail: string | null
      readonly actionLabel: string
      readonly actionHref: string
    }

interface StopAuthor {
  readonly name: string
  readonly avatarUrl: string | null
  readonly monogram: string
}

interface NewTarget {
  readonly id: string
  readonly kindLabel: string
  readonly title: LabelSegment
  readonly details: readonly LabelSegment[]
  readonly author: StopAuthor | null
  readonly updatedLabel: string
  readonly createReviewHref: string
}

interface RepositoryLineProps {
  readonly name: string
  readonly lineColor: LineColor
  readonly lineLabel: string
  readonly source: readonly LabelSegment[]
  readonly countLabel: string
  readonly createReviewHref: string
  readonly configurationLabel: string
  readonly addTargetLabel: string
  readonly newTargets: readonly NewTarget[]
  readonly content: LineContent
  readonly isDismissing: boolean
  readonly onDismissNewTarget: (targetId: string) => void
  readonly onConfigure: () => void
  readonly onAddTarget: () => void
}

const RAIL_GRID = "grid grid-cols-[2.5rem_minmax(0,1fr)]"

const LineTerminus = () => (
  <span aria-hidden="true" className="flex flex-col items-center">
    <span className="h-4 w-1 bg-(--line)" />
    <span className="h-1 w-4 bg-(--line)" />
  </span>
)

interface LineStopsProps {
  readonly repositoryName: string
  readonly content: LineContent
  readonly onAddTarget: () => void
}

const LineStops = ({ repositoryName, content, onAddTarget }: LineStopsProps) => {
  if (content.kind === "targets") {
    return (
      <ol>
        {content.targets.map((target) => (
          <ReviewTargetStop
            key={target.id}
            title={target.title}
            details={target.details}
            author={target.author}
            repositoryName={repositoryName}
            targetId={target.id}
            branchStatus={target.branchStatus}
            statusLabel={target.statusLabel}
            updatedLabel={target.updatedLabel}
          />
        ))}
      </ol>
    )
  }
  if (content.kind === "no-branches") {
    return (
      <div className={RAIL_GRID}>
        <LineTerminus />
        <div className="grid justify-items-start gap-2 py-1.5">
          <div className="grid gap-0.5">
            <p className="text-sm font-bold">{content.message}</p>
            <p className="max-w-[62ch] text-sm text-muted-foreground">{content.detail}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAddTarget}>{content.actionLabel}</Button>
        </div>
      </div>
    )
  }
  if (content.kind === "problem") {
    return (
      <div className={RAIL_GRID}>
        <LineTerminus />
        <div className="grid gap-1 py-1.5">
          <p className="text-sm">
            {content.message}
            {" "}
            <a href={content.actionHref} className="underline">{content.actionLabel}</a>
          </p>
          {content.detail === null
            ? null
            : <p className="font-mono text-[0.82rem] wrap-anywhere text-muted-foreground">{content.detail}</p>}
        </div>
      </div>
    )
  }
  return (
    <div className={RAIL_GRID}>
      <LineTerminus />
      <p className="py-1.5 text-sm text-muted-foreground">{content.message}</p>
    </div>
  )
}

const RepositoryLine = ({
  name,
  lineColor,
  lineLabel,
  source,
  countLabel,
  createReviewHref,
  configurationLabel,
  addTargetLabel,
  newTargets,
  content,
  isDismissing,
  onDismissNewTarget,
  onConfigure,
  onAddTarget,
}: RepositoryLineProps) => {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={cn("border-t-2 border-foreground pt-5 pb-6", LINE_COLOR_CLASSES[lineColor])}>
      <div className={RAIL_GRID}>
        <span aria-hidden="true" className="flex flex-col items-center">
          <LineRoundel label={lineLabel} />
          <span className="w-1 flex-1 bg-(--line)" />
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-2">
          <div className="min-w-0 flex-1 basis-64">
            <h2 id={headingId} className="text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground">{name}</h2>
            <LabelSegments segments={source} className="text-sm text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">{countLabel}</p>
          <a href={createReviewHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <span className="text-box-cap">Create Flight Plan</span>
          </a>
          <IconButton icon="add" label={addTargetLabel} onClick={onAddTarget} />
          <IconButton icon="settings" label={configurationLabel} onClick={onConfigure} />
        </div>
      </div>
      <ul>
        {newTargets.map((target) => (
          <NewTargetPrompt
            key={target.id}
            kindLabel={target.kindLabel}
            title={target.title}
            details={target.details}
            author={target.author}
            updatedLabel={target.updatedLabel}
            createReviewHref={target.createReviewHref}
            isDismissing={isDismissing}
            onDismiss={() => { onDismissNewTarget(target.id) }}
          />
        ))}
      </ul>
      <LineStops repositoryName={name} content={content} onAddTarget={onAddTarget} />
    </section>
  )
}

export default RepositoryLine
