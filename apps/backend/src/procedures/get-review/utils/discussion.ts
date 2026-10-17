import { formatRelativeTime } from "@/procedures/list-repositories/utils/format-relative-time"
import { monogramOf } from "@/procedures/list-repositories/utils/monogram"
import { parseProse } from "@flightplan/codegraph"
import type { FileRow, WalkthroughBand } from "@flightplan/configurations"
import type { DiffPosition, DiffSide } from "@flightplan/git-forge"
import { countLabel } from "./count-label"
import type { ComposerLabels, ConversationBand, DiscussedWalkthroughBand, ReviewDraft, Sharing, ThreadView } from "./schemas"

export type ReviewVerdict = "comment" | "approve" | "request-changes"

export interface CommentAuthor {
  readonly name: string
  readonly avatarUrl: string | null
}

export interface Comment {
  readonly id: string
  readonly author: CommentAuthor
  readonly body: string
  readonly createdAt: Date
}

export interface CommentThread {
  readonly id: string
  readonly path: string
  readonly position: DiffPosition | null
  readonly isResolved: boolean
  readonly isOutdated: boolean
  readonly comments: readonly Comment[]
}

export interface SubmittedReview {
  readonly id: string
  readonly author: CommentAuthor
  readonly verdict: ReviewVerdict
  readonly body: string
  readonly createdAt: Date
}

export interface Discussion {
  readonly comments: readonly Comment[]
  readonly threads: readonly CommentThread[]
  readonly reviews: readonly SubmittedReview[]
}

export interface PendingComment {
  readonly id: string
  readonly position: DiffPosition
  readonly body: string
  readonly createdAt: Date
  readonly commit: string
}

export interface ForgeAbilities {
  readonly verdicts: readonly ReviewVerdict[]
  readonly canReply: boolean
  readonly canResolve: boolean
  readonly canRequestReviewers: boolean
  readonly canRequestAgain: boolean
}

export interface DiscussionSource {
  readonly discussion: Discussion
  readonly pendingComments: readonly PendingComment[]
  readonly viewer: CommentAuthor
  readonly abilities: ForgeAbilities
  readonly commit: string
  readonly now: Date
}

export const EMPTY_DISCUSSION: Discussion = { comments: [], threads: [], reviews: [] }

export const NO_ABILITIES: ForgeAbilities = {
  verdicts: [],
  canReply: false,
  canResolve: false,
  canRequestReviewers: false,
  canRequestAgain: false,
}

export type PublicationKind = "description" | "claude"

export interface Publication {
  readonly kind: PublicationKind
  readonly url: string
  readonly publishedAt: Date
}

export interface PublishingRequest {
  readonly requestedAt: Date
  readonly channel: "agent" | "listener"
}

export const CONVERSATION_ANCHOR_ID = "conversation"

const NO_CODE_LINKS: ReadonlySet<string> = new Set()
const PENDING_LABEL = "Pending"
const DISCARD_LABEL = "Discard"
const RESOLVED_LABEL = "Resolved"
const THREAD_MARK_LABELS: Readonly<Record<ThreadView["mark"]["kind"], string>> = {
  open: "Open thread",
  pending: "Pending comment",
  resolved: "Resolved thread",
}
const RESOLVE_LABEL = "Resolve conversation"
const REOPEN_LABEL = "Reopen conversation"
const OUTDATED_NOTE = "outdated"
const STALE_LABEL = "Written against an earlier commit. Discard it and comment again."
const PENDING_THREAD_PREFIX = "pending-"
const EXCERPT_LENGTH = 80
const ELLIPSIS = "…"
const RANGE_DASH = "–"

const VERDICT_LABELS: Readonly<Record<ReviewVerdict, string>> = {
  "comment": "Commented",
  "approve": "Approved",
  "request-changes": "Requested changes",
}

const VERDICT_OPTIONS: ReviewDraft["verdicts"] = [
  { key: "comment", label: "Comment", description: "Send your comments without a verdict." },
  { key: "approve", label: "Approve", description: "Send your comments and approve the change." },
  { key: "request-changes", label: "Request changes", description: "Send your comments and ask for changes before merging." },
]

const personOf = (author: CommentAuthor): { name: string, avatarUrl: string | null, monogram: string } => ({
  name: author.name,
  avatarUrl: author.avatarUrl,
  monogram: monogramOf(author.name),
})

const isRange = (position: DiffPosition): boolean => position.startLine !== position.endLine

const linesPhrase = (position: DiffPosition, singular: string, plural: string): string =>
  isRange(position)
    ? `${plural} ${String(position.startLine)}${RANGE_DASH}${String(position.endLine)}`
    : `${singular} ${String(position.endLine)}`

export const rangeLabelOf = (position: DiffPosition): string | null => {
  if (position.side === "old") return linesPhrase(position, "Removed line", "Removed lines")
  return isRange(position) ? linesPhrase(position, "Line", "Lines") : null
}

const linesLabelOf = (position: DiffPosition): string =>
  position.side === "old" ? linesPhrase(position, "Removed line", "Removed lines") : linesPhrase(position, "Line", "Lines")

const threadMarkOf = (kind: ThreadView["mark"]["kind"]): ThreadView["mark"] => ({ kind, label: THREAD_MARK_LABELS[kind] })

const locationLabelOf = (path: string, position: DiffPosition | null): string =>
  position === null
    ? `${path} (${OUTDATED_NOTE})`
    : `${path}, ${linesPhrase(position, position.side === "old" ? "removed line" : "line", position.side === "old" ? "removed lines" : "lines")}`

const toCommentView = (comment: Comment, now: Date): ThreadView["comments"][number] => ({
  id: comment.id,
  author: personOf(comment.author),
  body: parseProse(comment.body, NO_CODE_LINKS),
  timeLabel: formatRelativeTime(comment.createdAt, now),
  pendingLabel: null,
  discardLabel: null,
})

const resolutionOf = (thread: CommentThread, abilities: ForgeAbilities): ThreadView["resolution"] =>
  abilities.canResolve
    ? { label: thread.isResolved ? REOPEN_LABEL : RESOLVE_LABEL, isResolving: !thread.isResolved }
    : null

const toThreadView = (thread: CommentThread, position: DiffPosition, { abilities, now }: DiscussionSource): ThreadView => ({
  id: thread.id,
  side: position.side,
  lineLabel: String(position.endLine),
  startLineLabel: String(position.startLine),
  rangeLabel: rangeLabelOf(position),
  linesLabel: linesLabelOf(position),
  mark: threadMarkOf(thread.isResolved ? "resolved" : "open"),
  startsOpen: false,
  statusLabel: thread.isResolved ? RESOLVED_LABEL : null,
  resolution: resolutionOf(thread, abilities),
  canReply: abilities.canReply,
  comments: thread.comments.map((comment) => toCommentView(comment, now)),
})

const toPendingThreadView = (pending: PendingComment, { viewer, now }: DiscussionSource): ThreadView => ({
  id: `${PENDING_THREAD_PREFIX}${pending.id}`,
  side: pending.position.side,
  lineLabel: String(pending.position.endLine),
  startLineLabel: String(pending.position.startLine),
  rangeLabel: rangeLabelOf(pending.position),
  linesLabel: linesLabelOf(pending.position),
  mark: threadMarkOf("pending"),
  startsOpen: true,
  statusLabel: null,
  resolution: null,
  canReply: false,
  comments: [{
    id: pending.id,
    author: personOf(viewer),
    body: parseProse(pending.body, NO_CODE_LINKS),
    timeLabel: formatRelativeTime(pending.createdAt, now),
    pendingLabel: PENDING_LABEL,
    discardLabel: DISCARD_LABEL,
  }],
})

const lineKeyOf = (side: DiffSide, lineLabel: string): string => `${side}:${lineLabel}`

const lineKeysIn = (rows: readonly FileRow[]): ReadonlySet<string> =>
  new Set(
    rows
      .flatMap((row) => (row.kind === "lines" ? row.lines : []))
      .flatMap((line) => (line.mark === "removed" ? lineKeyOf("old", line.removedNumberLabel) : lineKeyOf("new", line.numberLabel))),
  )

const isShownIn = (shownKeys: ReadonlySet<string>, position: DiffPosition): boolean =>
  shownKeys.has(lineKeyOf(position.side, String(position.endLine)))

const isCurrent = (pending: PendingComment, commit: string): boolean => pending.commit === commit

const threadsOfFile = (file: WalkthroughBand["files"][number], source: DiscussionSource): ThreadView[] => {
  const shownKeys = lineKeysIn(file.rows)
  return [
    ...source.discussion.threads.flatMap((thread) =>
      thread.position !== null && thread.path === file.path && isShownIn(shownKeys, thread.position)
        ? [toThreadView(thread, thread.position, source)]
        : []),
    ...source.pendingComments
      .filter((pending) => pending.position.path === file.path && isCurrent(pending, source.commit) && isShownIn(shownKeys, pending.position))
      .map((pending) => toPendingThreadView(pending, source)),
  ]
}

const withThreads = (file: WalkthroughBand["files"][number], threads: ThreadView[]): DiscussedWalkthroughBand["files"][number] => ({
  ...file,
  countLabels: threads.length === 0 ? file.countLabels : [...file.countLabels, countLabel(threads.length, "thread", "threads")],
  threads,
})

export const attachThreads = (band: WalkthroughBand, source: DiscussionSource | null): DiscussedWalkthroughBand => ({
  ...band,
  files: band.files.map((file) => withThreads(file, source === null ? [] : threadsOfFile(file, source))),
})

const linesBetween = (position: DiffPosition): number[] =>
  Array.from({ length: position.endLine - position.startLine + 1 }, (_unused, offset) => position.startLine + offset)

export const threadLinesOfFile = (source: DiscussionSource | null, path: string): number[] =>
  source === null
    ? []
    : [
        ...source.discussion.threads.flatMap((thread) => (thread.position === null ? [] : [thread.position])),
        ...source.pendingComments.filter((pending) => isCurrent(pending, source.commit)).map((pending) => pending.position),
      ]
        .filter((position) => position.path === path && position.side === "new")
        .flatMap(linesBetween)

interface TimedEntry {
  readonly createdAt: Date
  readonly entry: ConversationBand["entries"][number]
}

const commentEntry = (comment: Comment, locationLabel: string | null, now: Date): TimedEntry => ({
  createdAt: comment.createdAt,
  entry: { ...toCommentView(comment, now), verdict: null, verdictLabel: null, locationLabel },
})

const hasSomethingToShow = (review: SubmittedReview): boolean => review.verdict !== "comment" || review.body.trim() !== ""

const reviewEntry = (review: SubmittedReview, now: Date): TimedEntry => ({
  createdAt: review.createdAt,
  entry: {
    id: review.id,
    author: personOf(review.author),
    verdict: review.verdict,
    verdictLabel: VERDICT_LABELS[review.verdict],
    body: parseProse(review.body, NO_CODE_LINKS),
    timeLabel: formatRelativeTime(review.createdAt, now),
    pendingLabel: null,
    discardLabel: null,
    locationLabel: null,
  },
})

export const buildConversation = (
  { discussion, now }: DiscussionSource,
  placedThreadIds: ReadonlySet<string>,
): ConversationBand => {
  const entries = [
    ...discussion.comments.map((comment) => commentEntry(comment, null, now)),
    ...discussion.threads
      .filter((thread) => !placedThreadIds.has(thread.id))
      .flatMap((thread) =>
        thread.comments.map((comment) => commentEntry(comment, locationLabelOf(thread.path, thread.position), now))),
    ...discussion.reviews.filter(hasSomethingToShow).map((review) => reviewEntry(review, now)),
  ].sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime())
  return {
    anchorId: CONVERSATION_ANCHOR_ID,
    heading: "Conversation",
    emptyMessage: entries.length === 0 ? "Nobody has commented on this pull request yet." : null,
    entries: entries.map(({ entry }) => entry),
  }
}

const excerptOf = (body: string): string => {
  const [firstLine = ""] = body.trim().split("\n")
  return firstLine.length > EXCERPT_LENGTH ? `${firstLine.slice(0, EXCERPT_LENGTH)}${ELLIPSIS}` : firstLine
}

const toPendingEntry = (pending: PendingComment, commit: string): ReviewDraft["pendingComments"][number] => ({
  id: pending.id,
  locationLabel: locationLabelOf(pending.position.path, pending.position),
  excerpt: excerptOf(pending.body),
  staleLabel: isCurrent(pending, commit) ? null : STALE_LABEL,
  discardLabel: DISCARD_LABEL,
})

export const staleCommentsOf = (pendingComments: readonly PendingComment[], commit: string): PendingComment[] =>
  pendingComments.filter((pending) => !isCurrent(pending, commit))

const pendingLabelOf = (pendingCount: number): string =>
  pendingCount === 0
    ? "No pending comments."
    : `${countLabel(pendingCount, "pending comment", "pending comments")} will be sent with it.`

export const buildReviewDraft = (source: DiscussionSource | null, unavailableReason: string | null): ReviewDraft => {
  const pendingComments = source?.pendingComments ?? []
  const pendingCount = pendingComments.length
  const verdicts = source?.abilities.verdicts ?? []
  return {
    isAvailable: unavailableReason === null,
    unavailableReason,
    buttonLabel: pendingCount === 0 ? "Submit review" : `Submit review (${String(pendingCount)})`,
    heading: "Submit your review",
    pendingLabel: pendingLabelOf(pendingCount),
    pendingComments: pendingComments.map((pending) => toPendingEntry(pending, source?.commit ?? "")),
    bodyPlaceholder: "Leave a summary for the author",
    submitLabel: "Submit review",
    verdicts: VERDICT_OPTIONS.filter((option) => verdicts.includes(option.key)),
  }
}

export const COMPOSER_LABELS: ComposerLabels = {
  addLabel: "Add a comment on this line",
  placeholder: "Leave a comment",
  replyPlaceholder: "Reply",
  submitLabel: "Add to review",
  postNowLabel: "Add single comment",
  replyLabel: "Reply",
  commentLabel: "Comment",
  cancelLabel: "Cancel",
  rangeHint: "Shift-click the + of another line to comment on a range.",
}

interface SharingOptionCopy {
  readonly label: string
  readonly description: string
  readonly actionLabel: string
  readonly pendingLabel: string
  readonly publishedPhrase: string
  readonly linkLabel: string
}

const OPTION_COPY: Readonly<Record<PublicationKind, SharingOptionCopy>> = {
  description: {
    label: "Attach to the pull request description",
    description: "Uploads the review artifact as a file and links it from the description.",
    actionLabel: "Attach",
    pendingLabel: "Attaching…",
    publishedPhrase: "Attached",
    linkLabel: "Open the description",
  },
  claude: {
    label: "Publish as a Claude artifact",
    description: "Asks your agent to publish a read-only copy as a private Claude artifact you can share.",
    actionLabel: "Publish",
    pendingLabel: "Publishing…",
    publishedPhrase: "Published",
    linkLabel: "Open the artifact",
  },
}

const PUBLICATION_KINDS: readonly PublicationKind[] = ["description", "claude"]

export const buildSharing = (
  publications: readonly Publication[],
  hasForge: boolean,
  now: Date,
  isPublishingToClaude: boolean,
): Sharing => ({
  buttonLabel: "Share",
  options: PUBLICATION_KINDS.map((kind) => {
    const copy = OPTION_COPY[kind]
    const publication = publications.find((candidate) => candidate.kind === kind)
    return {
      key: kind,
      label: copy.label,
      description: copy.description,
      actionLabel: copy.actionLabel,
      pendingLabel: copy.pendingLabel,
      isPending: kind === "claude" && isPublishingToClaude,
      isAvailable: kind === "claude" || hasForge,
      statusLabel: publication === undefined
        ? null
        : `${copy.publishedPhrase} ${formatRelativeTime(publication.publishedAt, now)}`,
      link: publication === undefined ? null : { href: publication.url, label: copy.linkLabel },
    }
  }),
})
