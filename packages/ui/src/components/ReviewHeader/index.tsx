import { CheckIcon, GitBranchIcon, MessageSquareIcon, XIcon, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import Avatar from "@/components/Avatar"
import LabelSegments, { type LabelSegment } from "@/components/LabelSegments"
import StopRing, { type StopStatus } from "@/components/StopRing"
import { cn } from "@/lib/utils"

type ReviewerState = "pending" | "commented" | "approved" | "changes-requested"

interface Person {
  readonly name: string
  readonly avatarUrl: string | null
  readonly monogram: string
}

interface Link {
  readonly href: string
  readonly label: string
}

interface ArtifactFreshness {
  readonly label: string
  readonly isOutOfDate: boolean
}

export type ReviewHeaderContent
  = | {
    readonly kind: "pull-request"
    readonly title: string
    readonly author: Person
    readonly status: StopStatus
    readonly statusLabel: string
    readonly artifactFreshness: ArtifactFreshness | null
    readonly reviewers: readonly (Person & { readonly state: ReviewerState, readonly stateLabel: string })[]
    readonly reviewersEmptyLabel: string | null
  }
  | {
    readonly kind: "branch"
    readonly branch: string
    readonly forgeMessage: string
    readonly artifactFreshness: ArtifactFreshness | null
    readonly action: Link
  }

interface ReviewHeaderProps {
  readonly header: ReviewHeaderContent
  readonly changedFiles?: readonly LabelSegment[] | null
  readonly actions?: ReactNode
}

const STATE_ICONS: Record<ReviewerState, LucideIcon | null> = {
  "pending": null,
  "commented": MessageSquareIcon,
  "approved": CheckIcon,
  "changes-requested": XIcon,
}

const STATE_PIP_CLASSES: Record<ReviewerState, string> = {
  "pending": "border-sign-muted bg-sign",
  "commented": "border-sign bg-sign-muted text-sign",
  "approved": "border-sign bg-sign-foreground text-sign",
  "changes-requested": "border-sign bg-destructive text-sign-foreground",
}

const BAND_AVATAR_CLASSES = "border-sign-foreground bg-sign-foreground text-sign"
const BAND_LINK_CLASSES = "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-sign-foreground/35 px-2.5 text-[0.8rem] text-sign-foreground hover:bg-sign-foreground/10"

const BAND_ATTENTION_LABEL = "font-bold text-signal"
const BAND_QUIET_LABEL = "text-sign-muted"

const BAND_STATUS_LABEL_CLASSES: Record<StopStatus, string> = {
  "no-review": "text-sign-foreground",
  "awaiting-review": BAND_ATTENTION_LABEL,
  "awaiting-reply": BAND_ATTENTION_LABEL,
  "stale": BAND_QUIET_LABEL,
  "draft": BAND_QUIET_LABEL,
  "closed": BAND_QUIET_LABEL,
  "merged": BAND_QUIET_LABEL,
}

const ArtifactFreshnessLabel = ({ freshness }: { readonly freshness: ArtifactFreshness }) => (
  <span className={cn("shrink-0 text-sm", freshness.isOutOfDate ? BAND_ATTENTION_LABEL : BAND_QUIET_LABEL)}>
    {freshness.label}
  </span>
)

const ReviewerAvatar = ({ reviewer }: { readonly reviewer: Extract<ReviewHeaderContent, { kind: "pull-request" }>["reviewers"][number] }) => {
  const StateIcon = STATE_ICONS[reviewer.state]
  return (
    <li className="relative" title={reviewer.stateLabel}>
      <Avatar imageUrl={reviewer.avatarUrl} monogram={reviewer.monogram} className={cn("size-6", BAND_AVATAR_CLASSES)} />
      <span
        aria-hidden="true"
        data-state={reviewer.state}
        className={cn("absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full border", STATE_PIP_CLASSES[reviewer.state])}
      >
        {StateIcon === null ? null : <StateIcon className="size-2.5" strokeWidth={3} />}
      </span>
      <span className="sr-only">{reviewer.stateLabel}</span>
    </li>
  )
}

const ChangedFiles = ({ segments }: { readonly segments: readonly LabelSegment[] | null }) =>
  (segments === null
    ? null
    : <LabelSegments segments={segments} className="shrink-0 flex-nowrap text-sm text-sign-muted tabular-nums" />)

const ReviewHeader = ({ header, changedFiles = null, actions }: ReviewHeaderProps) => (header.kind === "branch"
  ? (
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <GitBranchIcon aria-hidden="true" className="size-4 shrink-0 text-sign-muted" />
        <h1 className="min-w-0 truncate font-mono text-[0.94rem] font-bold">{header.branch}</h1>
        {header.artifactFreshness === null ? null : <ArtifactFreshnessLabel freshness={header.artifactFreshness} />}
        <ChangedFiles segments={changedFiles} />
        <span className="flex-1" />
        <span className="shrink-0 text-sm text-sign-muted">{header.forgeMessage}</span>
        <a href={header.action.href} className={BAND_LINK_CLASSES}>
          <span className="text-box-cap">{header.action.label}</span>
        </a>
        {actions}
      </div>
    )
  : (
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0" title={header.author.name}>
          <Avatar imageUrl={header.author.avatarUrl} monogram={header.author.monogram} className={cn("size-7 text-xs", BAND_AVATAR_CLASSES)} />
          <span className="sr-only">{header.author.name}</span>
        </span>
        <h1 className="min-w-0 truncate text-base font-bold" title={header.title}>{header.title}</h1>
        <span className="flex shrink-0 items-center gap-1.5">
          <StopRing status={header.status} />
          <span className={cn("text-sm", BAND_STATUS_LABEL_CLASSES[header.status])}>{header.statusLabel}</span>
        </span>
        {header.artifactFreshness === null ? null : <ArtifactFreshnessLabel freshness={header.artifactFreshness} />}
        <ChangedFiles segments={changedFiles} />
        <span className="flex-1" />
        {header.reviewersEmptyLabel === null
          ? <ul aria-label="Reviewers" className="flex shrink-0 gap-2.5">{header.reviewers.map((reviewer) => <ReviewerAvatar key={reviewer.name} reviewer={reviewer} />)}</ul>
          : <span className="shrink-0 text-sm text-sign-muted">{header.reviewersEmptyLabel}</span>}
        {actions}
      </div>
    ))

export default ReviewHeader
