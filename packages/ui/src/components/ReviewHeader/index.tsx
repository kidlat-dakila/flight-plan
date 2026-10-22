import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { CheckIcon, GitBranchIcon, MessageSquareIcon, UserPlusIcon, XIcon, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import Avatar from "@/components/Avatar"
import Button from "@/components/blocks/button"
import DropdownMenu, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/blocks/dropdown-menu"
import Input from "@/components/blocks/input"
import LabelSegments, { type LabelSegment } from "@/components/LabelSegments"
import { BandPopover } from "@/components/ReviewActions"
import StopRing, { type StopStatus } from "@/components/StopRing"
import TargetSwitcher, { type TargetSwitching } from "@/components/TargetSwitcher"
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

interface ReviewerRequestLabels {
  readonly buttonLabel: string
  readonly heading: string
  readonly searchPlaceholder: string
  readonly emptyLabel: string
  readonly requestLabel: string
}

export interface ReviewerOption extends Person {
  readonly login: string
  readonly detail: string
}

export interface ReviewerRequesting {
  readonly query: string
  readonly options: readonly ReviewerOption[] | null
  readonly isPending: boolean
  readonly onOpen: () => void
  readonly onSearch: (query: string) => void
  readonly onRequest: (login: string) => void
  readonly onRemove: (login: string) => void
}

export interface AgentStatus {
  readonly isOnline: boolean
  readonly label: string
  readonly onClick: (() => void) | null
}

export type ReviewHeaderContent
  = | {
    readonly kind: "pull-request"
    readonly title: string
    readonly author: Person
    readonly status: StopStatus
    readonly statusLabel: string
    readonly artifactFreshness: ArtifactFreshness | null
    readonly reviewers: readonly (Person & {
      readonly state: ReviewerState
      readonly stateLabel: string
      readonly request: { readonly login: string, readonly label: string, readonly isRemoving: boolean } | null
    })[]
    readonly reviewersEmptyLabel: string | null
    readonly reviewerRequest: ReviewerRequestLabels | null
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
  readonly authorLabel?: string | null
  readonly reviewerRequesting?: ReviewerRequesting | null
  readonly targetSwitching?: TargetSwitching | null
  readonly agentStatus?: AgentStatus | null
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

const BAND_CORE_CHANGE_LABEL = "font-bold text-signal"
const BAND_QUIET_LABEL = "text-sign-muted"

const BAND_STATUS_LABEL_CLASSES: Record<StopStatus, string> = {
  "no-review": "text-sign-foreground",
  "awaiting-review": BAND_CORE_CHANGE_LABEL,
  "awaiting-reply": BAND_CORE_CHANGE_LABEL,
  "stale": BAND_QUIET_LABEL,
  "draft": BAND_QUIET_LABEL,
  "closed": BAND_QUIET_LABEL,
  "merged": BAND_QUIET_LABEL,
}

const ArtifactFreshnessLabel = ({ freshness }: { readonly freshness: ArtifactFreshness }) => (
  <span className={cn("shrink-0 text-sm", freshness.isOutOfDate ? BAND_CORE_CHANGE_LABEL : BAND_QUIET_LABEL)}>
    {freshness.label}
  </span>
)

const AGENT_STATUS_CLASSES = "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-sign-muted"
const AGENT_STATUS_BUTTON_CLASSES = "cursor-pointer hover:bg-sign-foreground/10 hover:text-sign-foreground focus-visible:outline-2 focus-visible:outline-sign-foreground"
const AGENT_STATUS_DOT_CLASSES = "size-2 shrink-0 rounded-full"
const ONLINE_DOT_CLASSES = "bg-diff-added"
const OFFLINE_DOT_CLASSES = "bg-sign-muted"

const AgentStatusContent = ({ status }: { readonly status: AgentStatus }) => (
  <>
    <span
      aria-hidden="true"
      data-online={status.isOnline}
      className={cn(AGENT_STATUS_DOT_CLASSES, status.isOnline ? ONLINE_DOT_CLASSES : OFFLINE_DOT_CLASSES)}
    />
    {status.label}
  </>
)

const AgentStatusIndicator = ({ status }: { readonly status: AgentStatus | null }) => {
  if (status === null) return null
  const { onClick } = status
  return onClick === null
    ? <span className={AGENT_STATUS_CLASSES}><AgentStatusContent status={status} /></span>
    : (
        <button type="button" className={cn(AGENT_STATUS_CLASSES, AGENT_STATUS_BUTTON_CLASSES)} onClick={onClick}>
          <AgentStatusContent status={status} />
        </button>
      )
}

type ReviewerContent = Extract<ReviewHeaderContent, { kind: "pull-request" }>["reviewers"][number]

const REVIEWER_BUTTON_CLASSES = "relative block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sign-foreground"

const ReviewerMark = ({ reviewer }: { readonly reviewer: ReviewerContent }) => {
  const StateIcon = STATE_ICONS[reviewer.state]
  return (
    <>
      <Avatar imageUrl={reviewer.avatarUrl} monogram={reviewer.monogram} className={cn("size-6", BAND_AVATAR_CLASSES)} />
      <span
        aria-hidden="true"
        data-state={reviewer.state}
        className={cn("absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full border", STATE_PIP_CLASSES[reviewer.state])}
      >
        {StateIcon === null ? null : <StateIcon className="size-2.5" strokeWidth={3} />}
      </span>
      <span className="sr-only">{reviewer.stateLabel}</span>
    </>
  )
}

const ReviewerAvatar = ({ reviewer, requesting }: { readonly reviewer: ReviewerContent, readonly requesting: ReviewerRequesting | null }) => {
  const { request } = reviewer
  if (request === null || requesting === null) {
    return <li className="relative" title={reviewer.stateLabel}><ReviewerMark reviewer={reviewer} /></li>
  }
  return (
    <li title={reviewer.stateLabel}>
      <DropdownMenu>
        <DropdownMenuTrigger className={REVIEWER_BUTTON_CLASSES}>
          <ReviewerMark reviewer={reviewer} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={requesting.isPending}
            onClick={() => {
              if (request.isRemoving) requesting.onRemove(request.login)
              else requesting.onRequest(request.login)
            }}
          >
            {request.label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

const ReviewerRequestMenu = ({ labels, requesting }: { readonly labels: ReviewerRequestLabels, readonly requesting: ReviewerRequesting }) => (
  <BandPopover
    onOpen={requesting.onOpen}
    trigger={(
      <PopoverPrimitive.Trigger aria-label={labels.buttonLabel} title={labels.buttonLabel} className={cn(BAND_LINK_CLASSES, "px-1.5")}>
        <UserPlusIcon aria-hidden="true" className="size-3.5" />
      </PopoverPrimitive.Trigger>
    )}
  >
    <PopoverPrimitive.Title className="text-base leading-6 font-bold">{labels.heading}</PopoverPrimitive.Title>
    <Input
      type="search"
      value={requesting.query}
      placeholder={labels.searchPlaceholder}
      aria-label={labels.searchPlaceholder}
      onChange={(event) => { requesting.onSearch(event.target.value) }}
    />
    {requesting.options?.length === 0 ? <p className="text-muted-foreground">{labels.emptyLabel}</p> : null}
    <ul className="flex max-h-72 flex-col overflow-y-auto">
      {(requesting.options ?? []).map((option) => (
        <li key={option.login} className="flex items-center gap-2 border-t py-2 first:border-t-0 first:pt-0 last:pb-0">
          <Avatar imageUrl={option.avatarUrl} monogram={option.monogram} className="size-6" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-bold">{option.name}</span>
            <span className="truncate text-xs text-muted-foreground">{option.detail}</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`${labels.requestLabel} ${option.name}`}
            disabled={requesting.isPending}
            onClick={() => { requesting.onRequest(option.login) }}
          >
            {labels.requestLabel}
          </Button>
        </li>
      ))}
    </ul>
  </BandPopover>
)

const ChangedFiles = ({ segments }: { readonly segments: readonly LabelSegment[] | null }) =>
  (segments === null
    ? null
    : <LabelSegments segments={segments} className="shrink-0 flex-nowrap text-sm text-sign-muted tabular-nums" />)

const BRANCH_TITLE_CLASSES = "font-mono text-[0.94rem] font-bold"
const PULL_REQUEST_TITLE_CLASSES = "text-base font-bold"
const BRANCH_ICON = <GitBranchIcon aria-hidden="true" className="size-4 shrink-0 text-sign-muted" />

const AUTHOR_LABEL_CLASSES = "shrink-0 rounded-sm border border-sign-foreground/35 px-1.5 py-0.5 text-xs font-bold text-sign-foreground"

interface TitleHeaderProps {
  readonly title: string
  readonly isBranch: boolean
  readonly label: string
  readonly changedFiles?: readonly LabelSegment[] | null
  readonly switching?: TargetSwitching | null
  readonly actions?: ReactNode
}

export const TitleHeader = ({ title, isBranch, label, changedFiles = null, switching = null, actions }: TitleHeaderProps) => (
  <div className="flex min-w-0 flex-1 items-center gap-3">
    <TargetSwitcher
      title={title}
      className={isBranch ? BRANCH_TITLE_CLASSES : PULL_REQUEST_TITLE_CLASSES}
      icon={isBranch ? BRANCH_ICON : null}
      switching={switching}
    />
    <span className={AUTHOR_LABEL_CLASSES}>{label}</span>
    <ChangedFiles segments={changedFiles} />
    <span className="flex-1" />
    {actions}
  </div>
)

const ReviewerHeader = ({ header, changedFiles, requesting, switching, actions }: {
  readonly header: ReviewHeaderContent
  readonly changedFiles: readonly LabelSegment[] | null
  readonly requesting: ReviewerRequesting | null
  readonly switching: TargetSwitching | null
  readonly actions: ReactNode
}) => (header.kind === "branch"
  ? (
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <TargetSwitcher title={header.branch} className={BRANCH_TITLE_CLASSES} icon={BRANCH_ICON} switching={switching} />
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
        <TargetSwitcher title={header.title} className={PULL_REQUEST_TITLE_CLASSES} switching={switching} />
        <span className="flex shrink-0 items-center gap-1.5">
          <StopRing status={header.status} />
          <span className={cn("text-sm", BAND_STATUS_LABEL_CLASSES[header.status])}>{header.statusLabel}</span>
        </span>
        {header.artifactFreshness === null ? null : <ArtifactFreshnessLabel freshness={header.artifactFreshness} />}
        <ChangedFiles segments={changedFiles} />
        <span className="flex-1" />
        {header.reviewersEmptyLabel === null
          ? (
              <ul aria-label="Reviewers" className="flex shrink-0 gap-2.5">
                {header.reviewers.map((reviewer) => <ReviewerAvatar key={reviewer.name} reviewer={reviewer} requesting={requesting} />)}
              </ul>
            )
          : <span className="shrink-0 text-sm text-sign-muted">{header.reviewersEmptyLabel}</span>}
        {header.reviewerRequest === null || requesting === null
          ? null
          : <ReviewerRequestMenu labels={header.reviewerRequest} requesting={requesting} />}
        {actions}
      </div>
    ))

const ReviewHeader = ({
  header,
  changedFiles = null,
  authorLabel = null,
  reviewerRequesting = null,
  targetSwitching = null,
  agentStatus = null,
  actions,
}: ReviewHeaderProps) => {
  const trailing = (
    <>
      <AgentStatusIndicator status={agentStatus} />
      {actions}
    </>
  )
  return authorLabel === null
    ? (
        <ReviewerHeader
          header={header}
          changedFiles={changedFiles}
          requesting={reviewerRequesting}
          switching={targetSwitching}
          actions={trailing}
        />
      )
    : (
        <TitleHeader
          title={header.kind === "branch" ? header.branch : header.title}
          isBranch={header.kind === "branch"}
          label={authorLabel}
          changedFiles={changedFiles}
          switching={targetSwitching}
          actions={trailing}
        />
      )
}

export default ReviewHeader
