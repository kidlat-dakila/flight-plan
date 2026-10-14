import {
  GitAdapterError,
  mergeReviewers,
  type Capability,
  REVIEW_VERDICTS,
  type Comparison,
  type DiffPosition,
  type DiscussionComment,
  type Fetcher,
  type HistoryOptions,
  type LineRange,
  type ListOptions,
  type Person,
  type PullRequestDiscussion,
  type PullRequestHistory,
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
import {
  BITBUCKET_API_ROOT,
  BitbucketForgeAdapter,
  type BitbucketInline,
  type BitbucketVerdict,
} from "./custom-providers/bitbucket-forge-adapter"
import type { RawAccount, RawActivity, RawComment, RawPullRequest, RawThread } from "./custom-providers/bitbucket-raw"
import {
  orThrowGitAdapterError,
  readFileAt,
  readHeadSha,
  toGitAdapterError,
} from "./forges-provider"
import { splitDiff } from "./helpers/diff"
import { matchPeople, mergePeople, normalizeLogin } from "./helpers/people"
import { createRest } from "./helpers/rest"
import { mergeTargets, pullRequestItemToTarget } from "./merge-targets"

const DEFAULT_LIST_LIMIT = 30
const MAX_PAGE_SIZE = 50
const ACTIVITY_PAGE_SIZE = 50
const MEMBER_PAGE_SIZE = 100
const RECENT_AUTHOR_LIMIT = 50
const SHORT_SHA_LENGTH = 8
const AUTHOR_HANDLE_PREFIX = "@"
const NO_ACTIVITY: RawActivity = { comments: [], commitDates: [] }
const HISTORY_STATES: Readonly<Record<string, PullRequestHistory["state"]>> = {
  OPEN: "open",
  MERGED: "merged",
  DECLINED: "closed",
  SUPERSEDED: "closed",
}
const CLOUD_HOST = /(^|\/\/)(api\.)?bitbucket\.org($|\/)/i

export function bitbucketAnchor(path: string, line?: number): string {
  return line === undefined ? `#L${path}` : `#L${path}T${String(line)}`
}

export function isCloudUrl(baseUrl: string): boolean {
  const configured = baseUrl.trim().replace(/\/+$/, "")
  return configured === "" || CLOUD_HOST.test(configured)
}

function splitWorkspace(repo: string): { workspace: string, slug: string } {
  const at = repo.indexOf("/")
  return at === -1
    ? { workspace: repo, slug: "" }
    : { workspace: repo.slice(0, at), slug: repo.slice(at + 1) }
}

function toPerson(user: RawAccount): Person {
  return { login: handleOf(user), name: user.display_name, avatarUrl: avatarOf(user) }
}

function handleOf(user: RawAccount | undefined): string {
  return user?.nickname ?? user?.display_name ?? ""
}

function avatarOf(user: RawAccount | undefined): string {
  return user?.links?.avatar?.href ?? ""
}

function bitbucketReviewState(raw: string): Reviewer["state"] {
  switch (raw.trim().toLowerCase()) {
    case "approved":
      return "approved"
    case "changes_requested":
      return "changes-requested"
    default:
      return "pending"
  }
}

function toTarget(raw: RawPullRequest, reason: ReviewTarget["reason"]): ReviewTarget {
  const destination = raw.destination
  return {
    ref: { kind: "pr", number: raw.id },
    title: raw.title ?? "",
    author: handleOf(raw.author) || "unknown",
    url: raw.links?.html?.href ?? "",
    updatedAt: raw.updated_on ?? "",
    isDraft: raw.draft ?? false,
    ...(raw.source?.branch?.name === undefined ? {} : { headBranch: raw.source.branch.name }),
    ...(destination?.branch?.name === undefined ? {} : { baseRef: destination.branch.name }),
    ...(destination?.commit?.hash === undefined ? {} : { baseSha: destination.commit.hash }),
    reason,
  }
}

function toReviewSummary(raw: RawPullRequest): ReviewSummary {
  const found: Reviewer[] = (raw.participants ?? [])
    .filter((participant) => {
      const hasActed = (participant.state ?? "") !== ""
      return hasActed || (participant.role ?? "").toUpperCase() === "REVIEWER"
    })
    .map((participant) => ({
      login: handleOf(participant.user),
      name: participant.user?.display_name,
      avatarUrl: avatarOf(participant.user),
      state: bitbucketReviewState(participant.state ?? ""),
    }))
  return {
    author: {
      login: handleOf(raw.author) || "unknown",
      name: raw.author?.display_name,
      avatarUrl: avatarOf(raw.author),
    },
    reviewers: mergeReviewers(found),
  }
}

function isOpenAndReady(raw: RawPullRequest): boolean {
  return HISTORY_STATES[(raw.state ?? "").toUpperCase()] === "open" && raw.draft !== true
}

function approvalsOf(raw: RawPullRequest): PullRequestHistory["discussion"] {
  return (raw.participants ?? []).flatMap((participant) =>
    participant.approved === true && participant.participated_on !== null && participant.participated_on !== undefined
      ? [{ login: handleOf(participant.user), at: participant.participated_on }]
      : [],
  )
}

function withoutDuplicateIds(pullRequests: readonly RawPullRequest[]): RawPullRequest[] {
  return pullRequests.filter(
    (pullRequest, position) => pullRequests.findIndex((other) => other.id === pullRequest.id) === position,
  )
}

function uniqueLogins(authors: readonly string[]): string[] {
  return authors
    .map((author) => author.replace(AUTHOR_HANDLE_PREFIX, ""))
    .filter((author) => author !== "")
    .filter((author, position, all) => all.findIndex((other) => other.toLowerCase() === author.toLowerCase()) === position)
}

function toHistory(raw: RawPullRequest, activity: RawActivity): PullRequestHistory {
  return {
    number: raw.id,
    title: raw.title ?? "",
    headBranch: raw.source?.branch?.name ?? "",
    state: HISTORY_STATES[(raw.state ?? "").toUpperCase()] ?? "closed",
    isDraft: raw.draft ?? false,
    author: {
      login: handleOf(raw.author) || "unknown",
      name: raw.author?.display_name,
      avatarUrl: avatarOf(raw.author),
    },
    createdAt: raw.created_on ?? raw.updated_on ?? "",
    updatedAt: raw.updated_on ?? "",
    requestedReviewers: (raw.reviewers ?? []).map(handleOf).filter((login) => login !== ""),
    discussion: [...activity.comments, ...approvalsOf(raw)],
    commitDates: activity.commitDates,
  }
}

const VERDICT_STATES: ReadonlyMap<string, ReviewVerdict> = new Map([
  ["approved", "approve"],
  ["changes_requested", "request-changes"],
])

const VERDICT_ROUTES: Readonly<Record<ReviewVerdict, BitbucketVerdict | null>> = {
  "comment": null,
  "approve": "approve",
  "request-changes": "request-changes",
}

function toDiscussionComment(raw: RawComment): DiscussionComment {
  return {
    id: String(raw.id),
    author: toPerson(raw.user ?? {}),
    body: raw.content?.raw ?? "",
    createdAt: raw.created_on ?? "",
    url: raw.links?.html?.href ?? "",
  }
}

function toThreadPosition(inline: NonNullable<RawComment["inline"]>): DiffPosition | null {
  const isOnNewSide = inline.to !== null && inline.to !== undefined
  const endLine = isOnNewSide ? inline.to : inline.from
  if (endLine === null || endLine === undefined) return null
  const startLine = (isOnNewSide ? inline.start_to : inline.start_from) ?? endLine
  return { path: inline.path, side: isOnNewSide ? "new" : "old", startLine, endLine }
}

function toReviewThread({ root, replies }: RawThread): ReviewThread[] {
  if (root.inline === undefined) return []
  return [{
    id: String(root.id),
    path: root.inline.path,
    position: root.inline.outdated === true ? null : toThreadPosition(root.inline),
    isResolved: root.resolution !== null && root.resolution !== undefined,
    isOutdated: root.inline.outdated ?? false,
    comments: [root, ...replies].map(toDiscussionComment),
  }]
}

function toSubmittedReviews(raw: RawPullRequest): SubmittedReview[] {
  return (raw.participants ?? []).flatMap((participant) => {
    const verdict = VERDICT_STATES.get((participant.state ?? "").toLowerCase())
    const submittedAt = participant.participated_on
    if (verdict === undefined || submittedAt === null || submittedAt === undefined) return []
    return [{
      id: `${verdict}-${handleOf(participant.user)}`,
      author: toPerson(participant.user ?? {}),
      verdict,
      body: "",
      submittedAt,
      url: raw.links?.html?.href ?? "",
    }]
  })
}

function toPullRequestDiscussion(threads: readonly RawThread[], raw: RawPullRequest): PullRequestDiscussion {
  return {
    comments: threads
      .filter((thread) => thread.root.inline === undefined)
      .flatMap((thread) => [thread.root, ...thread.replies])
      .map(toDiscussionComment),
    threads: threads.flatMap(toReviewThread),
    reviews: toSubmittedReviews(raw),
  }
}

function toInline(position: DiffPosition): BitbucketInline {
  const isRange = position.startLine !== position.endLine
  return position.side === "new"
    ? { path: position.path, to: position.endLine, ...(isRange ? { start_to: position.startLine } : {}) }
    : { path: position.path, from: position.endLine, ...(isRange ? { start_from: position.startLine } : {}) }
}

function pullRequestId(ref: TargetRef): number {
  if (ref.kind !== "pr") {
    throw new GitAdapterError(
      "Bitbucket reads pull requests, and this row is a branch.",
      "unsupported",
    )
  }
  return ref.number
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

export interface BitbucketAdapterOptions {
  username: string
  token: string
  repo?: string
  root?: string
  fetcher?: Fetcher
  environment?: Readonly<Record<string, string | undefined>>
}

export class BitbucketAdapter extends BaseGitAdapter {
  override readonly id = "bitbucket"
  override readonly name = "Bitbucket"
  override readonly capabilities: ReadonlySet<Capability> = new Set<Capability>([
    "list",
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
  ])

  private readonly workspace: string
  private readonly slug: string
  private readonly provider: BitbucketForgeAdapter

  constructor({
    username,
    token,
    fetcher,
    ...options
  }: BitbucketAdapterOptions) {
    super(options)
    const { workspace, slug } = splitWorkspace(this.repo)
    this.workspace = workspace
    this.slug = slug
    const authorization = `Basic ${Buffer.from(`${username}:${token}`, "utf8").toString("base64")}`
    this.provider = new BitbucketForgeAdapter({
      rest: createRest({
        baseUrl: BITBUCKET_API_ROOT,
        name: "Bitbucket",
        headers: { authorization, accept: "application/json" },
        fetcher,
      }),
    })
  }

  override async listTargets(options: ListOptions): Promise<ReviewTarget[]> {
    const limit = Math.min(options.limit ?? DEFAULT_LIST_LIMIT, MAX_PAGE_SIZE)

    const pinned = Promise.all(
      (options.pinned ?? [])
        .filter((ref) => ref.kind === "pr")
        .map(async (ref) => this.target(ref).catch(() => null)),
    )

    const page = await orThrowGitAdapterError(
      this.provider.pullRequests.list(this.workspace, this.slug, {
        state: "open",
        perPage: limit,
      }),
    )
    const rows = page.items.map((item) => ({ ...pullRequestItemToTarget(item, "review-requested"), headBranch: item.sourceBranch }))
    const pinnedTargets = (await pinned).filter((row): row is ReviewTarget => row !== null)
    return mergeTargets([rows], pinnedTargets)
  }

  override async target(ref: TargetRef): Promise<ReviewTarget | null> {
    if (ref.kind === "branch") return super.target(ref)
    const raw = await this.pullRequest(pullRequestId(ref))
    if ((raw.state ?? "").toUpperCase() !== "OPEN") return null
    return toTarget(raw, "pinned")
  }

  override async reviewers(ref: TargetRef): Promise<ReviewSummary> {
    return toReviewSummary(await this.pullRequest(pullRequestId(ref)))
  }

  override async headSha(ref: TargetRef): Promise<string> {
    if (ref.kind === "branch") return super.headSha(ref)
    const id = pullRequestId(ref)
    const hash = await orThrowGitAdapterError(readHeadSha(this.provider, this.repo, id))
    if (hash === "") {
      throw new GitAdapterError(`Could not find the head commit of #${String(id)}.`)
    }
    return hash
  }

  override async diff(ref: TargetRef): Promise<string> {
    if (ref.kind === "branch") return super.diff(ref)
    return this.provider.readPullRequestDiff(this.workspace, this.slug, pullRequestId(ref))
  }

  override async compare(base: string, head: string): Promise<Comparison> {
    try {
      return await super.compare(base, head)
    } catch (cause) {
      if (!(cause instanceof GitAdapterError) || cause.problem !== "no-repo") throw cause
    }
    const [diff, commits] = await Promise.all([
      this.provider.readCompareDiff(this.workspace, this.slug, base, head),
      this.countCommits(base, head),
    ])
    return { files: splitDiff(diff), commits }
  }

  override async blob(path: string, sha: string): Promise<string> {
    try {
      return await super.blob(path, sha)
    } catch (cause) {
      if (!(cause instanceof GitAdapterError) || cause.problem !== "no-repo") throw cause
    }
    try {
      return await readFileAt(this.provider, this.repo, path, sha)
    } catch (cause) {
      const error = toGitAdapterError(cause)
      throw new GitAdapterError(
        describeMissingBlob(path, this.repo, sha, error),
        error.problem,
      )
    }
  }

  override async viewer(): Promise<Person> {
    return toPerson(await orThrowGitAdapterError(this.provider.readViewer()))
  }

  override async searchPeople(query: string): Promise<Person[]> {
    const [members, authors] = await Promise.all([
      orThrowGitAdapterError(this.provider.listWorkspaceMembers(this.workspace, MEMBER_PAGE_SIZE)),
      orThrowGitAdapterError(
        this.provider.listRecentPullRequestAuthors(this.workspace, this.slug, RECENT_AUTHOR_LIMIT),
      ),
    ])
    return matchPeople(mergePeople([...members.map(toPerson), ...authors.map(toPerson)]), query)
  }

  override async listPullRequests(options: HistoryOptions): Promise<PullRequestHistory[]> {
    const lists = await Promise.all(
      uniqueLogins(options.authors).map(async (login) =>
        await orThrowGitAdapterError(
          this.provider.listPullRequestsByAuthor(this.workspace, this.slug, login, Math.min(options.limit, MAX_PAGE_SIZE)),
        ),
      ),
    )
    return await Promise.all(
      withoutDuplicateIds(lists.flat()).map(async (raw) => await this.toPullRequestHistory(raw)),
    )
  }

  override reviewVerdicts(): readonly ReviewVerdict[] {
    return REVIEW_VERDICTS
  }

  override async discussion(ref: TargetRef): Promise<PullRequestDiscussion> {
    const id = pullRequestId(ref)
    const [threads, raw] = await Promise.all([
      orThrowGitAdapterError(this.provider.readRawThreads(this.workspace, this.slug, id)),
      this.pullRequest(id),
    ])
    return toPullRequestDiscussion(threads, raw)
  }

  override async submitReview(ref: TargetRef, submission: ReviewSubmission): Promise<void> {
    const id = pullRequestId(ref)
    await submission.comments.reduce(
      async (earlier, comment) => {
        await earlier
        await this.provider.postInlineComment(this.workspace, this.slug, id, comment.body, toInline(comment.position))
      },
      Promise.resolve(),
    )
    if (submission.body.trim() !== "") await this.provider.postDiscussionComment(this.workspace, this.slug, id, submission.body)
    const verdict = VERDICT_ROUTES[submission.verdict]
    if (verdict !== null) await this.provider.postReviewVerdict(this.workspace, this.slug, id, verdict)
  }

  override async addComment(ref: TargetRef, body: string): Promise<void> {
    await this.provider.postDiscussionComment(this.workspace, this.slug, pullRequestId(ref), body)
  }

  override async replyToThread(ref: TargetRef, threadId: string, body: string): Promise<void> {
    await this.provider.postThreadReply(this.workspace, this.slug, pullRequestId(ref), threadId, body)
  }

  override async resolveThread(ref: TargetRef, threadId: string): Promise<void> {
    await this.provider.markThreadResolved(this.workspace, this.slug, pullRequestId(ref), threadId, true)
  }

  override async reopenThread(ref: TargetRef, threadId: string): Promise<void> {
    await this.provider.markThreadResolved(this.workspace, this.slug, pullRequestId(ref), threadId, false)
  }

  override async searchReviewers(ref: TargetRef, query: string): Promise<Person[]> {
    pullRequestId(ref)
    return matchPeople(mergePeople((await this.members()).map(toPerson)), query)
  }

  override async requestReviewers(ref: TargetRef, logins: readonly string[]): Promise<void> {
    const id = pullRequestId(ref)
    const [raw, members] = await Promise.all([this.pullRequest(id), this.members()])
    const requested = logins.map((login) => {
      const uuid = members.find((member) => normalizeLogin(handleOf(member)) === normalizeLogin(login))?.uuid
      if (uuid === undefined) throw new GitAdapterError(`${this.name} has no workspace member named ${login}.`)
      return uuid
    })
    const current = (raw.reviewers ?? []).flatMap((reviewer) => reviewer.uuid ?? [])
    await this.provider.setReviewers(this.workspace, this.slug, id, raw.title ?? "", [...new Set([...current, ...requested])])
  }

  override async removeReviewRequests(ref: TargetRef, logins: readonly string[]): Promise<void> {
    const id = pullRequestId(ref)
    const raw = await this.pullRequest(id)
    const removed = new Set(logins.map(normalizeLogin))
    const kept = (raw.reviewers ?? [])
      .filter((reviewer) => !removed.has(normalizeLogin(handleOf(reviewer))))
      .flatMap((reviewer) => reviewer.uuid ?? [])
    await this.provider.setReviewers(this.workspace, this.slug, id, raw.title ?? "", kept)
  }

  override permalink(ref: TargetRef, path: string, range?: LineRange): string {
    return (
      `https://bitbucket.org/${this.repo}/pull-requests/${String(pullRequestId(ref))}/diff${
        bitbucketAnchor(path, range?.from)}`
    )
  }

  private async toPullRequestHistory(raw: RawPullRequest): Promise<PullRequestHistory> {
    if (!isOpenAndReady(raw)) return toHistory(raw, NO_ACTIVITY)
    const [detail, activity] = await Promise.all([
      orThrowGitAdapterError(this.pullRequest(raw.id)),
      orThrowGitAdapterError(
        this.provider.readPullRequestActivity(this.workspace, this.slug, raw.id, ACTIVITY_PAGE_SIZE),
      ),
    ])
    return toHistory(detail, activity)
  }

  private async members(): Promise<RawAccount[]> {
    return await orThrowGitAdapterError(this.provider.listWorkspaceMembers(this.workspace, MEMBER_PAGE_SIZE))
  }

  private async pullRequest(id: number): Promise<RawPullRequest> {
    return this.provider.readPullRequest(this.workspace, this.slug, id)
  }

  private async countCommits(base: string, head: string): Promise<number> {
    try {
      const comparison = await this.provider.commits.compare(
        this.workspace,
        this.slug,
        base,
        head,
      )
      return comparison.totalCount
    } catch {
      return 0
    }
  }
}
