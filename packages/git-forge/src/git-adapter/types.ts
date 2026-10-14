export type Capability
  = | "list"
    | "labels"
    | "filters"
    | "diff"
    | "compare"
    | "blob"
    | "headSha"
    | "permalink"
    | "reviewers"
    | "branches"
    | "history"
    | "people"
    | "files"
    | "search"
    | "discussion"
    | "review"
    | "replies"
    | "resolution"
    | "reviewRequests"
    | "repeatedReviewRequests"

export type GitAdapterId = "git" | "gh" | "github" | "gitlab" | "glab" | "bitbucket"

export type GitAdapterProblem
  = | "no-cli"
    | "auth"
    | "no-repo"
    | "unsupported"
    | "host-mismatch"
    | "network"
    | "unknown"

export class GitAdapterError extends Error {
  constructor(
    message: string,
    readonly problem: GitAdapterProblem = "unknown",
  ) {
    super(message)
  }
}

export type TargetRef
  = | { kind: "pr", number: number }
    | { kind: "branch", name: string }

const PULL_REQUEST_KEY_PREFIX = "pr-"
const BRANCH_KEY_PREFIX = "branch-"

export function refKey(ref: TargetRef): string {
  return ref.kind === "pr" ? `${PULL_REQUEST_KEY_PREFIX}${String(ref.number)}` : `${BRANCH_KEY_PREFIX}${ref.name}`
}

function toPullRequestRef(number: number): TargetRef | null {
  return Number.isInteger(number) && number > 0 ? { kind: "pr", number } : null
}

export function parseRefKey(value: unknown): TargetRef | null {
  if (typeof value === "number") return toPullRequestRef(value)
  if (typeof value !== "string") return null
  if (value.startsWith(PULL_REQUEST_KEY_PREFIX)) {
    return toPullRequestRef(Number(value.slice(PULL_REQUEST_KEY_PREFIX.length)))
  }
  if (!value.startsWith(BRANCH_KEY_PREFIX)) return null
  const name = value.slice(BRANCH_KEY_PREFIX.length)
  return name === "" ? null : { kind: "branch", name }
}

export function sameRef(first: TargetRef, second: TargetRef): boolean {
  return refKey(first) === refKey(second)
}

export interface ReviewTarget {
  ref: TargetRef
  title: string
  author: string
  url: string
  updatedAt: string
  isDraft: boolean
  headBranch?: string
  baseRef?: string
  baseSha?: string
  reason: "review-requested" | "mine" | "query" | "pinned" | "added"
}

export type ReviewState
  = | "pending"
    | "approved"
    | "changes-requested"
    | "commented"

export interface Person {
  login: string
  name?: string
  avatarUrl: string
}

export type Reviewer = Person & { state: ReviewState }

export interface ReviewSummary { author: Person, reviewers: Reviewer[] }

function withEarlierDetails(reviewer: Reviewer, seen: Reviewer | undefined): Reviewer {
  return {
    ...reviewer,
    avatarUrl: reviewer.avatarUrl === "" ? (seen?.avatarUrl ?? "") : reviewer.avatarUrl,
    name: reviewer.name ?? seen?.name,
  }
}

export function mergeReviewers(found: readonly Reviewer[]): Reviewer[] {
  const byLogin = found
    .filter((reviewer) => reviewer.login !== "")
    .reduce(
      (merged, reviewer) => {
        const key = reviewer.login.toLowerCase()
        return new Map([...merged, [key, withEarlierDetails(reviewer, merged.get(key))]])
      },
      new Map<string, Reviewer>(),
    )
  return [...byLogin.values()]
}

export interface ChangedFile {
  path: string
  status: string
  previousPath?: string
  patch?: string
}

export interface Comparison { files: ChangedFile[], commits: number }

export interface LineRange { from: number, to: number }

export interface FileSearch {
  patterns: readonly string[]
  extensions: readonly string[]
}

export interface Filter {
  review: readonly string[]
  labels: readonly string[]
}

export interface ListOptions {
  query?: string
  filter?: Filter
  includeMine?: boolean
  pinned?: readonly TargetRef[]
  limit?: number
}

export interface ReviewFilterOption { key: string, label: string }

export type PullRequestState = "open" | "closed" | "merged"

export interface DiscussionActivity { login: string, at: string }

export interface PullRequestHistory {
  number: number
  title: string
  headBranch: string
  state: PullRequestState
  isDraft: boolean
  author: Person
  createdAt: string
  updatedAt: string
  requestedReviewers: string[]
  discussion: DiscussionActivity[]
  commitDates: string[]
}

export type DiffSide = "old" | "new"

export interface DiffPosition {
  path: string
  side: DiffSide
  startLine: number
  endLine: number
}

export interface DiscussionComment {
  id: string
  author: Person
  body: string
  createdAt: string
  url: string
}

export interface ReviewThread {
  id: string
  path: string
  position: DiffPosition | null
  isResolved: boolean
  isOutdated: boolean
  comments: DiscussionComment[]
}

export type ReviewVerdict = "comment" | "approve" | "request-changes"

export interface SubmittedReview {
  id: string
  author: Person
  verdict: ReviewVerdict
  body: string
  submittedAt: string
  url: string
}

export const REVIEW_VERDICTS: readonly ReviewVerdict[] = ["comment", "approve", "request-changes"]

export interface PullRequestDiscussion {
  comments: DiscussionComment[]
  threads: ReviewThread[]
  reviews: SubmittedReview[]
}

export interface DraftComment {
  position: DiffPosition
  body: string
}

export interface ReviewSubmission {
  verdict: ReviewVerdict
  body: string
  comments: readonly DraftComment[]
  commitSha: string
}

export interface HistoryOptions {
  authors: readonly string[]
  limit: number
}

export type BranchScope = "everywhere" | "checkout"

export interface BranchTip {
  name: string
  sha: string
  authorEmail: string
  updatedAt: string
}

export interface BranchStart {
  startedAt: string
  authorEmail: string
}

export interface GitAdapter {
  readonly id: GitAdapterId
  readonly name: string
  readonly capabilities: ReadonlySet<Capability>
  readonly repo: string

  supports: (capability: Capability) => boolean
  reviewFilters: () => readonly ReviewFilterOption[]
  listTargets: (options: ListOptions) => Promise<ReviewTarget[]>
  target: (ref: TargetRef) => Promise<ReviewTarget | null>
  listLabels: () => Promise<string[]>
  reviewers: (ref: TargetRef) => Promise<ReviewSummary>
  headSha: (ref: TargetRef) => Promise<string>
  baseSha: (ref: TargetRef) => Promise<string>
  diff: (ref: TargetRef) => Promise<string>
  compare: (base: string, head: string) => Promise<Comparison>
  blob: (path: string, sha: string) => Promise<string>
  blobs: (paths: readonly string[], sha: string) => Promise<Map<string, string>>
  listFiles: (sha: string) => Promise<string[]>
  searchFiles: (sha: string, search: FileSearch) => Promise<string[]>
  permalink: (ref: TargetRef, path: string, range?: LineRange) => string
  viewer: () => Promise<Person>
  searchPeople: (query: string) => Promise<Person[]>
  reviewVerdicts: () => readonly ReviewVerdict[]
  discussion: (ref: TargetRef) => Promise<PullRequestDiscussion>
  submitReview: (ref: TargetRef, submission: ReviewSubmission) => Promise<void>
  addComment: (ref: TargetRef, body: string) => Promise<void>
  replyToThread: (ref: TargetRef, threadId: string, body: string) => Promise<void>
  resolveThread: (ref: TargetRef, threadId: string) => Promise<void>
  reopenThread: (ref: TargetRef, threadId: string) => Promise<void>
  searchReviewers: (ref: TargetRef, query: string) => Promise<Person[]>
  requestReviewers: (ref: TargetRef, logins: readonly string[]) => Promise<void>
  removeReviewRequests: (ref: TargetRef, logins: readonly string[]) => Promise<void>
  listPullRequests: (options: HistoryOptions) => Promise<PullRequestHistory[]>
  listBranches: (scope?: BranchScope) => Promise<BranchTip[]>
  branchStart: (name: string) => Promise<BranchStart | null>
  fetchRemotes: () => Promise<void>
}

const MIN_ABBREVIATED_COMMIT_LENGTH = 7

export function sameCommit(first: string, second: string): boolean {
  const left = first.trim().toLowerCase()
  const right = second.trim().toLowerCase()
  if (left === "" || right === "") return false
  if (left === right) return true
  const shorter = left.length <= right.length ? left : right
  const longer = shorter === left ? right : left
  return shorter.length >= MIN_ABBREVIATED_COMMIT_LENGTH && longer.startsWith(shorter)
}

export function unsupported(gitAdapter: string, what: string): GitAdapterError {
  return new GitAdapterError(`${gitAdapter} cannot ${what}.`, "unsupported")
}

export type Fetcher = (
  input: string,
  init?: RequestInit,
) => Promise<Response>
