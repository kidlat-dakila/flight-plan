import { formatRelativeTime } from "@/procedures/list-repositories/utils/format-relative-time"
import { monogramOf } from "@/procedures/list-repositories/utils/monogram"
import { parseProse } from "@flightplan/codegraph"
import type { WalkthroughBand } from "@flightplan/configurations"
import { countLabel } from "./count-label"
import type { ConversationBand, DiscussedWalkthroughBand, ReviewDraft, Sharing, ThreadView } from "./schemas"

export type ReviewVerdict = "comment" | "approve" | "request-changes"

export interface Comment {
  readonly id: string
  readonly author: string
  readonly body: string
  readonly createdAt: Date
  readonly isPending: boolean
}

export interface CommentThread {
  readonly id: string
  readonly path: string | null
  readonly line: number | null
  readonly comments: readonly Comment[]
}

export interface SubmittedReview {
  readonly id: string
  readonly author: string
  readonly verdict: ReviewVerdict
  readonly body: string
  readonly createdAt: Date
}

export interface Discussion {
  readonly threads: readonly CommentThread[]
  readonly reviews: readonly SubmittedReview[]
}

export const EMPTY_DISCUSSION: Discussion = { threads: [], reviews: [] }

export type PublicationKind = "description" | "claude"

export interface Publication {
  readonly kind: PublicationKind
  readonly url: string
  readonly publishedAt: Date
}

export interface ChatQuestion {
  readonly id: string
  readonly body: string
  readonly reference: string | null
  readonly sentAt: Date
}

export const REVIEWER_NAME = "you"

export const CONVERSATION_ANCHOR_ID = "conversation"

const NO_CODE_LINKS: ReadonlySet<string> = new Set()
const PENDING_LABEL = "Pending"

const VERDICT_LABELS: Readonly<Record<ReviewVerdict, string>> = {
  "comment": "Commented",
  "approve": "Approved",
  "request-changes": "Requested changes",
}

const personOf = (name: string): { name: string, avatarUrl: null, monogram: string } => ({
  name,
  avatarUrl: null,
  monogram: monogramOf(name),
})

const toCommentView = (comment: Comment, now: Date): ThreadView["comments"][number] => ({
  id: comment.id,
  author: personOf(comment.author),
  body: parseProse(comment.body, NO_CODE_LINKS),
  timeLabel: formatRelativeTime(comment.createdAt, now),
  pendingLabel: comment.isPending ? PENDING_LABEL : null,
})

export const threadsOfFile = (discussion: Discussion, path: string, now: Date): ThreadView[] =>
  discussion.threads
    .filter((thread) => thread.path === path && thread.line !== null)
    .map((thread) => ({
      id: thread.id,
      lineLabel: String(thread.line),
      comments: thread.comments.map((comment) => toCommentView(comment, now)),
    }))

export const attachThreads = (band: WalkthroughBand, discussion: Discussion, now: Date): DiscussedWalkthroughBand => ({
  ...band,
  files: band.files.map((file) => ({ ...file, threads: threadsOfFile(discussion, file.path, now) })),
})

export const threadLinesOfFile = (discussion: Discussion, path: string): number[] =>
  discussion.threads.flatMap((thread) => (thread.path === path && thread.line !== null ? [thread.line] : []))

interface TimedEntry {
  readonly createdAt: Date
  readonly entry: ConversationBand["entries"][number]
}

const commentEntry = (comment: Comment, now: Date): TimedEntry => ({
  createdAt: comment.createdAt,
  entry: { ...toCommentView(comment, now), verdict: null, verdictLabel: null },
})

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
  },
})

const isGeneral = (thread: CommentThread): boolean => thread.path === null

export const buildConversation = (discussion: Discussion, now: Date): ConversationBand => {
  const generalThreads = discussion.threads.filter(isGeneral)
  const entries = [
    ...generalThreads.flatMap((thread) => thread.comments.map((comment) => commentEntry(comment, now))),
    ...discussion.reviews.map((review) => reviewEntry(review, now)),
  ].sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime())
  return {
    anchorId: CONVERSATION_ANCHOR_ID,
    heading: "Conversation",
    threadId: generalThreads.find((_thread, position) => position === 0)?.id ?? null,
    emptyMessage: entries.length === 0 ? "Nobody has commented on this pull request yet." : null,
    entries: entries.map(({ entry }) => entry),
  }
}

export const pendingCommentCount = (discussion: Discussion): number =>
  discussion.threads.flatMap((thread) => thread.comments).filter((comment) => comment.isPending).length

export const buildReviewDraft = (discussion: Discussion, unavailableReason: string | null): ReviewDraft => {
  const pendingCount = pendingCommentCount(discussion)
  return {
    isAvailable: unavailableReason === null,
    unavailableReason,
    buttonLabel: pendingCount === 0 ? "Submit review" : `Submit review (${String(pendingCount)})`,
    heading: "Submit your review",
    pendingLabel: pendingCount === 0
      ? "No pending comments."
      : `${countLabel(pendingCount, "pending comment", "pending comments")} will be sent with it.`,
    bodyPlaceholder: "Leave a summary for the author",
    submitLabel: "Submit review",
    verdicts: [
      { key: "comment", label: "Comment", description: "Send your comments without a verdict." },
      { key: "approve", label: "Approve", description: "Send your comments and approve the change." },
      { key: "request-changes", label: "Request changes", description: "Send your comments and ask for changes before merging." },
    ],
  }
}

export const COMPOSER_LABELS = {
  addLabel: "Add a comment on this line",
  placeholder: "Leave a comment",
  replyPlaceholder: "Reply",
  submitLabel: "Add to review",
  cancelLabel: "Cancel",
} as const

interface SharingOptionCopy {
  readonly label: string
  readonly description: string
  readonly actionLabel: string
  readonly publishedPhrase: string
  readonly linkLabel: string
}

const OPTION_COPY: Readonly<Record<PublicationKind, SharingOptionCopy>> = {
  description: {
    label: "Attach to the pull request description",
    description: "Uploads the review artifact as a file and links it from the description.",
    actionLabel: "Attach",
    publishedPhrase: "Attached",
    linkLabel: "Open the description",
  },
  claude: {
    label: "Publish as a Claude artifact",
    description: "Publishes the review artifact as a private Claude artifact you can share.",
    actionLabel: "Publish",
    publishedPhrase: "Published",
    linkLabel: "Open the artifact",
  },
}

const PUBLICATION_KINDS: readonly PublicationKind[] = ["description", "claude"]

export const buildSharing = (
  publications: readonly Publication[],
  hasForge: boolean,
  now: Date,
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
      isAvailable: kind === "claude" || hasForge,
      statusLabel: publication === undefined
        ? null
        : `${copy.publishedPhrase} ${formatRelativeTime(publication.publishedAt, now)}`,
      link: publication === undefined ? null : { href: publication.url, label: copy.linkLabel },
    }
  }),
})
