import {
  GitAdapterError,
  mergeReviewers,
  REVIEW_VERDICTS,
  type Capability,
  type Comparison,
  type DiffSide,
  type DiscussionActivity,
  type DiscussionComment,
  type DraftComment,
  type HistoryOptions,
  type LineRange,
  type ListOptions,
  type Person,
  type PullRequestDiscussion,
  type PullRequestHistory,
  type ReviewFilterOption,
  type Reviewer,
  type ReviewSubmission,
  type ReviewSummary,
  type ReviewTarget,
  type ReviewThread,
  type ReviewVerdict,
  type SubmittedReview,
  type TargetRef,
} from "@/git-adapter/types"
import { BaseGitAdapter } from "./base"
import type {
  ExtendedGitHubProvider,
  GithubActor,
  GithubComparison,
  GithubDiscussion,
  GithubDiscussionComment,
  GithubHistoryPullRequest,
  GithubPersonNode,
  GithubPullRequest,
  GithubReviewComment,
  GithubReviewers,
  GithubReviewInput,
  GithubReviewThread,
  GithubSubmittedReview,
} from "./custom-providers/extended-github-provider"
import {
  orThrowGitAdapterError,
  orThrowRefusal,
  readFileAt,
  readHeadSha,
  splitRepo,
  toGitAdapterError,
} from "./forges-provider"
import {
  githubAvatar,
  githubReviewFilters,
  githubReviewState,
  githubSearch,
} from "./helpers/github-shared"
import { matchPeople, mergePeople } from "./helpers/people"
import { permalink as githubPermalink } from "./helpers/permalink"
import { mergeTargets, pullRequestItemToTarget } from "./merge-targets"

const DEFAULT_LIST_LIMIT = 30
const MAX_SEARCH_PAGE_SIZE = 100
const SORT_BY_RECENT = "sort:updated-desc"
const SHORT_SHA_LENGTH = 8
const DELETED_USER_LOGIN = "ghost"
const HISTORY_STATES: Record<GithubHistoryPullRequest["state"], PullRequestHistory["state"]> = {
  OPEN: "open",
  CLOSED: "closed",
  MERGED: "merged",
}

export function githubApiRoot(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "")
  if (trimmed === "") return "https://api.github.com"
  if (trimmed.endsWith("/api/v3")) return trimmed
  return `${trimmed}/api/v3`
}

function isMissingLocally(cause: unknown): boolean {
  return cause instanceof GitAdapterError && cause.problem === "no-repo"
}

function toTarget(raw: GithubPullRequest, reason: ReviewTarget["reason"]): ReviewTarget {
  return {
    ref: { kind: "pr", number: raw.number },
    title: raw.title,
    author: raw.user?.login ?? "unknown",
    url: raw.html_url,
    updatedAt: raw.updated_at,
    isDraft: raw.draft ?? false,
    ...(raw.head?.ref === undefined ? {} : { headBranch: raw.head.ref }),
    ...(raw.base?.ref === undefined ? {} : { baseRef: raw.base.ref }),
    ...(raw.base?.sha === undefined ? {} : { baseSha: raw.base.sha }),
    reason,
  }
}

function toReviewer(
  user: { login?: string, name?: string, avatar_url?: string },
  state: Reviewer["state"],
): Reviewer {
  const login = user.login ?? ""
  return {
    login,
    name: user.name,
    avatarUrl: user.avatar_url ?? githubAvatar(login),
    state,
  }
}

function toReviewSummary(raw: GithubReviewers): ReviewSummary {
  const reviewed = raw.reviews.map((review) =>
    toReviewer(review.user ?? {}, githubReviewState(review.state ?? "")),
  )
  const pending = raw.requested.map((user) => toReviewer(user, "pending"))
  const author = raw.pullRequest.user
  return {
    author: {
      login: author?.login ?? "unknown",
      name: author?.name,
      avatarUrl: author?.avatar_url ?? githubAvatar(author?.login ?? ""),
    },
    reviewers: mergeReviewers([...reviewed, ...pending]),
  }
}

function present<Value>(value: Value | null): value is Value {
  return value !== null
}

function toDiscussionActivity(login: string | undefined, at: string | null): DiscussionActivity[] {
  return login === undefined || at === null ? [] : [{ login, at }]
}

function toDiscussion(raw: GithubHistoryPullRequest): DiscussionActivity[] {
  return [
    ...raw.reviews.nodes.filter(present).flatMap((review) => toDiscussionActivity(review.author?.login, review.submittedAt)),
    ...raw.comments.nodes.filter(present).flatMap((comment) => toDiscussionActivity(comment.author?.login, comment.createdAt)),
    ...raw.reviewThreads.nodes
      .filter(present)
      .flatMap((thread) => thread.comments.nodes.filter(present))
      .flatMap((comment) => toDiscussionActivity(comment.author?.login, comment.createdAt)),
  ]
}

function toHistory(raw: GithubHistoryPullRequest): PullRequestHistory {
  return {
    number: raw.number,
    title: raw.title,
    headBranch: raw.headRefName,
    state: HISTORY_STATES[raw.state],
    isDraft: raw.isDraft,
    author: { login: raw.author?.login ?? DELETED_USER_LOGIN, avatarUrl: raw.author?.avatarUrl ?? "" },
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    requestedReviewers: raw.reviewRequests.nodes.flatMap((node) => node?.requestedReviewer?.login ?? []),
    discussion: toDiscussion(raw),
    commitDates: raw.commits.nodes.flatMap((node) => node?.commit.committedDate ?? []),
  }
}

const PENDING_REVIEW_STATE = "PENDING"

const DIFF_SIDES: Readonly<Record<GithubReviewThread["diffSide"], DiffSide>> = { LEFT: "old", RIGHT: "new" }

const GITHUB_SIDES: Readonly<Record<DiffSide, GithubReviewComment["side"]>> = { old: "LEFT", new: "RIGHT" }

const REVIEW_EVENTS: Readonly<Record<ReviewVerdict, GithubReviewInput["event"]>> = {
  "comment": "COMMENT",
  "approve": "APPROVE",
  "request-changes": "REQUEST_CHANGES",
}

function toAuthor(actor: GithubActor): Person {
  const login = actor?.login ?? DELETED_USER_LOGIN
  return { login, name: actor?.name ?? undefined, avatarUrl: actor?.avatarUrl ?? githubAvatar(login) }
}

function toDiscussionComment(raw: GithubDiscussionComment): DiscussionComment {
  return { id: raw.id, author: toAuthor(raw.author), body: raw.body, createdAt: raw.createdAt, url: raw.url }
}

function toReviewThread(raw: GithubReviewThread): ReviewThread {
  return {
    id: raw.id,
    path: raw.path,
    position: raw.line === null
      ? null
      : { path: raw.path, side: DIFF_SIDES[raw.diffSide], startLine: raw.startLine ?? raw.line, endLine: raw.line },
    isResolved: raw.isResolved,
    isOutdated: raw.isOutdated,
    comments: raw.comments.nodes.filter(present).map(toDiscussionComment),
  }
}

function toVerdict(state: string): ReviewVerdict {
  const reviewState = githubReviewState(state)
  if (reviewState === "approved") return "approve"
  return reviewState === "changes-requested" ? "request-changes" : "comment"
}

function toSubmittedReview(raw: GithubSubmittedReview): SubmittedReview[] {
  return raw.submittedAt === null || raw.state.toUpperCase() === PENDING_REVIEW_STATE
    ? []
    : [{
        id: raw.id,
        author: toAuthor(raw.author),
        verdict: toVerdict(raw.state),
        body: raw.body,
        submittedAt: raw.submittedAt,
        url: raw.url,
      }]
}

function toPullRequestDiscussion(raw: GithubDiscussion): PullRequestDiscussion {
  return {
    comments: raw.comments.map(toDiscussionComment),
    threads: raw.threads.map(toReviewThread),
    reviews: raw.reviews.flatMap(toSubmittedReview),
  }
}

function toReviewComment({ position, body }: DraftComment): GithubReviewComment {
  const side = GITHUB_SIDES[position.side]
  return {
    path: position.path,
    body,
    line: position.endLine,
    side,
    ...(position.startLine === position.endLine ? {} : { start_line: position.startLine, start_side: side }),
  }
}

function toReviewInput(submission: ReviewSubmission): GithubReviewInput {
  return {
    commit_id: submission.commitSha,
    body: submission.body,
    event: REVIEW_EVENTS[submission.verdict],
    comments: submission.comments.map(toReviewComment),
  }
}

function toPerson(node: GithubPersonNode): Person {
  return { login: node.login, name: node.name ?? undefined, avatarUrl: node.avatarUrl }
}

function withoutDuplicateNumbers(pullRequests: readonly GithubHistoryPullRequest[]): GithubHistoryPullRequest[] {
  return pullRequests.filter(
    (pullRequest, position) => pullRequests.findIndex((other) => other.number === pullRequest.number) === position,
  )
}

function toComparison(raw: GithubComparison): Comparison {
  return {
    commits: raw.total_commits ?? 0,
    files: (raw.files ?? []).map((file) => ({
      path: file.filename ?? "",
      status: file.status ?? "modified",
      previousPath: file.previous_filename,
      patch: file.patch,
    })),
  }
}

function describeMissingBlob(
  path: string,
  repo: string,
  sha: string,
  error: GitAdapterError,
): string {
  const shortSha = sha.slice(0, SHORT_SHA_LENGTH)
  return error.problem === "no-repo"
    ? `${path} is not in ${repo} at ${shortSha}. The walkthrough `
    + `may have been written against a different commit, or the file `
    + `was renamed.`
    : `${path} could not be read from ${repo} at ${shortSha}: ${error.message}`
}

export abstract class GithubAdapter extends BaseGitAdapter {
  override readonly capabilities: ReadonlySet<Capability> = new Set<Capability>([
    "list",
    "labels",
    "filters",
    "diff",
    "compare",
    "blob",
    "headSha",
    "permalink",
    "reviewers",
    "branches",
    "history",
    "people",
    "files",
    "search",
    "discussion",
    "review",
    "replies",
    "resolution",
    "reviewRequests",
    "repeatedReviewRequests",
  ])

  protected abstract readonly provider: ExtendedGitHubProvider

  protected abstract resolveRepo(): Promise<string>

  override reviewFilters(): readonly ReviewFilterOption[] {
    return githubReviewFilters()
  }

  override async listTargets(options: ListOptions): Promise<ReviewTarget[]> {
    const limit = options.limit ?? DEFAULT_LIST_LIMIT
    const customQuery = options.query?.trim() ?? ""
    const filter = options.filter ?? { review: [], labels: [] }
    const filterQualifiers = githubSearch(filter)

    const pinned = Promise.all(
      (options.pinned ?? [])
        .filter((ref) => ref.kind === "pr")
        .map(async (ref) => this.target(ref).catch(() => null)),
    )

    const searchGroups
      = customQuery !== ""
        ? [await this.search(customQuery, limit, "query")]
        : await Promise.all([
            filterQualifiers.length === 0
              ? this.listOpen(limit)
              : this.search(filterQualifiers.join(" "), limit, "review-requested"),
            ...(options.includeMine === false
              ? []
              : [
                  this.search(
                    [
                      "author:@me",
                      ...githubSearch({ review: [], labels: filter.labels }),
                    ].join(" "),
                    limit,
                    "mine",
                  ),
                ]),
          ])

    const pinnedTargets = (await pinned).filter(
      (row): row is ReviewTarget => row !== null,
    )
    return mergeTargets(searchGroups, pinnedTargets)
  }

  override async viewer(): Promise<Person> {
    const user = await orThrowGitAdapterError(this.provider.readViewer())
    const login = user.login ?? ""
    return { login, name: user.name, avatarUrl: user.avatar_url ?? githubAvatar(login) }
  }

  override async searchPeople(query: string): Promise<Person[]> {
    const { owner, name } = await this.coordinates()
    const { members, authors } = await orThrowGitAdapterError(this.provider.searchPeople(owner, name, query))
    return mergePeople([...members.map(toPerson), ...matchPeople(authors.map(toPerson), query)])
  }

  override async listPullRequests(options: HistoryOptions): Promise<PullRequestHistory[]> {
    const { owner, name } = await this.coordinates()
    const pullRequests = await orThrowGitAdapterError(
      this.provider.listPullRequestHistories(owner, name, options.authors, options.limit),
    )
    return withoutDuplicateNumbers(pullRequests).map(toHistory)
  }

  override async listRecentPullRequests(limit: number): Promise<PullRequestHistory[]> {
    const { owner, name } = await this.coordinates()
    const pullRequests = await orThrowGitAdapterError(this.provider.listRecentPullRequestHistories(owner, name, limit))
    return withoutDuplicateNumbers(pullRequests).map(toHistory)
  }

  override async headSha(ref: TargetRef): Promise<string> {
    if (ref.kind === "branch") return super.headSha(ref)
    const number = this.pullRequestNumber(ref)
    const sha = await orThrowGitAdapterError(
      readHeadSha(this.provider, await this.resolveRepo(), number),
    )
    if (sha === "") {
      throw new GitAdapterError(`Could not find the head commit of #${String(number)}.`)
    }
    return sha
  }

  override async blob(path: string, sha: string): Promise<string> {
    try {
      return await super.blob(path, sha)
    } catch (cause) {
      if (!isMissingLocally(cause)) throw cause
    }
    try {
      return await readFileAt(this.provider, await this.resolveRepo(), path, sha)
    } catch (cause) {
      const error = toGitAdapterError(cause)
      throw new GitAdapterError(
        describeMissingBlob(path, this.repo, sha, error),
        error.problem,
      )
    }
  }

  override async target(ref: TargetRef): Promise<ReviewTarget | null> {
    if (ref.kind === "branch") return super.target(ref)
    const { owner, name } = await this.coordinates()
    const raw = await orThrowGitAdapterError(
      this.provider.readPullRequest(owner, name, this.pullRequestNumber(ref)),
    )
    if ((raw.state ?? "").toLowerCase() !== "open") return null
    return toTarget(raw, "pinned")
  }

  override async listLabels(): Promise<string[]> {
    const { owner, name } = await this.coordinates()
    const labels = await orThrowGitAdapterError(this.provider.listLabelNames(owner, name))
    return labels.filter((label) => label !== "").sort((a, b) => a.localeCompare(b))
  }

  override async reviewers(ref: TargetRef): Promise<ReviewSummary> {
    const { owner, name } = await this.coordinates()
    const raw = await orThrowGitAdapterError(
      this.provider.readReviewers(owner, name, this.pullRequestNumber(ref)),
    )
    return toReviewSummary(raw)
  }

  override reviewVerdicts(): readonly ReviewVerdict[] {
    return REVIEW_VERDICTS
  }

  override async discussion(ref: TargetRef): Promise<PullRequestDiscussion> {
    const { owner, name } = await this.coordinates()
    const raw = await orThrowGitAdapterError(this.provider.readDiscussion(owner, name, this.pullRequestNumber(ref)))
    return toPullRequestDiscussion(raw)
  }

  override async submitReview(ref: TargetRef, submission: ReviewSubmission): Promise<void> {
    const { owner, name } = await this.coordinates()
    await orThrowRefusal(this.provider.submitReview(owner, name, this.pullRequestNumber(ref), toReviewInput(submission)))
  }

  override async addComment(ref: TargetRef, body: string): Promise<void> {
    const { owner, name } = await this.coordinates()
    await orThrowRefusal(this.provider.postDiscussionComment(owner, name, this.pullRequestNumber(ref), body))
  }

  override async replyToThread(ref: TargetRef, threadId: string, body: string): Promise<void> {
    this.pullRequestNumber(ref)
    await orThrowRefusal(this.provider.postThreadReply(threadId, body))
  }

  override async resolveThread(ref: TargetRef, threadId: string): Promise<void> {
    this.pullRequestNumber(ref)
    await orThrowRefusal(this.provider.setThreadResolved(threadId, true))
  }

  override async reopenThread(ref: TargetRef, threadId: string): Promise<void> {
    this.pullRequestNumber(ref)
    await orThrowRefusal(this.provider.setThreadResolved(threadId, false))
  }

  override async searchReviewers(ref: TargetRef, query: string): Promise<Person[]> {
    this.pullRequestNumber(ref)
    const { owner, name } = await this.coordinates()
    const { members } = await orThrowGitAdapterError(this.provider.searchPeople(owner, name, query))
    return mergePeople(members.map(toPerson))
  }

  override async requestReviewers(ref: TargetRef, logins: readonly string[]): Promise<void> {
    const { owner, name } = await this.coordinates()
    await orThrowRefusal(this.provider.requestReviewers(owner, name, this.pullRequestNumber(ref), logins))
  }

  override async removeReviewRequests(ref: TargetRef, logins: readonly string[]): Promise<void> {
    const { owner, name } = await this.coordinates()
    await orThrowRefusal(this.provider.removeReviewRequests(owner, name, this.pullRequestNumber(ref), logins))
  }

  override async diff(ref: TargetRef): Promise<string> {
    if (ref.kind === "branch") return super.diff(ref)
    const { owner, name } = await this.coordinates()
    return orThrowGitAdapterError(
      this.provider.readPullRequestDiff(owner, name, this.pullRequestNumber(ref)),
    )
  }

  override async compare(base: string, head: string): Promise<Comparison> {
    try {
      return await super.compare(base, head)
    } catch (cause) {
      if (!isMissingLocally(cause)) throw cause
    }
    const { owner, name } = await this.coordinates()
    const raw = await orThrowGitAdapterError(
      this.provider.compareWithPatches(owner, name, base, head),
    )
    return toComparison(raw)
  }

  override permalink(ref: TargetRef, path: string, range?: LineRange): string {
    return githubPermalink(this.repo, this.pullRequestNumber(ref), path, range)
  }

  protected async listOpen(limit: number): Promise<ReviewTarget[]> {
    const { owner, name } = await this.coordinates()
    const rows = await orThrowGitAdapterError(
      this.provider.listOpenPullRequests(owner, name, limit),
    )
    return rows.map((row) => toTarget(row, "review-requested"))
  }

  protected pullRequestNumber(ref: TargetRef): number {
    if (ref.kind !== "pr") {
      throw new GitAdapterError(
        `${this.name} reads pull requests, and this row is a branch.`,
        "unsupported",
      )
    }
    return ref.number
  }

  private async coordinates(): Promise<{ owner: string, name: string }> {
    return splitRepo(await this.resolveRepo())
  }

  private async search(
    query: string,
    limit: number,
    reason: ReviewTarget["reason"],
  ): Promise<ReviewTarget[]> {
    const { owner, name } = splitRepo(await this.resolveRepo())
    const page = await orThrowGitAdapterError(
      this.provider.pullRequests.search(owner, name, `${query} ${SORT_BY_RECENT}`.trim(), {
        state: "open",
        perPage: Math.min(limit, MAX_SEARCH_PAGE_SIZE),
      }),
    )
    return page.items.map((item) => pullRequestItemToTarget(item, reason))
  }
}
