import * as crypto from "node:crypto"
import {
  GitAdapterError,
  mergeReviewers,
  REVIEW_VERDICTS,
  type Capability,
  type Comparison,
  type DiffPosition,
  type DiffSide,
  type DiscussionComment,
  type DraftComment,
  type GitAdapterId,
  type HistoryOptions,
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
import {
  ExtendedGitLabProvider,
  type GitlabActivity,
  type GitlabApprovals,
  type GitlabComparison,
  type GitlabDiffPosition,
  type GitlabDiscussion,
  type GitlabDiscussionNote,
  type GitlabLinePoint,
  type GitlabMergeRequest,
  type GitlabUser,
} from "./custom-providers/extended-gitlab-provider"
import {
  orThrowGitAdapterError,
  orThrowRefusal,
  readFileAt,
  splitRepo,
  toGitAdapterError,
} from "./forges-provider"
import { diffLinesByPath, findPositionEnds, type DiffLine } from "./helpers/diff-lines"
import { matchPeople, mergePeople, normalizeLogin } from "./helpers/people"
import { mergeTargets } from "./merge-targets"

const DEFAULT_LIST_LIMIT = 30
const MAX_PAGE_SIZE = 100
const MEMBER_LIMIT = 20
const ACTIVITY_PAGE_SIZE = 50
const SHORT_SHA_LENGTH = 8
const AUTHOR_HANDLE_PREFIX = "@"
const REVIEW_NOTE_PATTERN = /^(approved|requested changes)/i
const NO_ACTIVITY: GitlabActivity = { notes: [], commitDates: [] }
const HISTORY_STATES: Readonly<Record<string, PullRequestHistory["state"]>> = {
  opened: "open",
  closed: "closed",
  locked: "closed",
  merged: "merged",
}
const CLOUD_URL = "https://gitlab.com"
const API_SUFFIX = "/api/v4"

const REVIEW_FILTERS: readonly ReviewFilterOption[] = [
  { key: "assigned-to-me", label: "Assigned to you" },
  { key: "awaiting-my-review", label: "Awaiting review from you" },
  { key: "created-by-me", label: "Opened by you" },
  { key: "not-draft", label: "Not a draft" },
]

type Query = Record<string, string | number>

export function gitlabApiRoot(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "")
  const host = trimmed === "" ? CLOUD_URL : trimmed
  return host.endsWith(API_SUFFIX) ? host : `${host}${API_SUFFIX}`
}

export function gitlabDiffAnchor(path: string): string {
  return crypto.createHash("sha1").update(path, "utf8").digest("hex")
}

function gitlabWebRoot(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "")
  return (trimmed === "" ? CLOUD_URL : trimmed).replace(/\/api\/v4$/, "")
}

function mergeRequestIid(ref: TargetRef): number {
  if (ref.kind !== "pr") {
    throw new GitAdapterError(
      "GitLab reads merge requests, and this row is a branch.",
      "unsupported",
    )
  }
  return ref.number
}

function toTarget(raw: GitlabMergeRequest, reason: ReviewTarget["reason"]): ReviewTarget {
  return {
    ref: { kind: "pr", number: raw.iid },
    title: raw.title,
    author: raw.author?.username ?? "unknown",
    url: raw.web_url,
    updatedAt: raw.updated_at,
    isDraft: raw.draft ?? raw.work_in_progress ?? false,
    ...(raw.source_branch === undefined ? {} : { headBranch: raw.source_branch }),
    ...(raw.target_branch === undefined ? {} : { baseRef: raw.target_branch }),
    ...(raw.diff_refs?.base_sha === undefined
      ? {}
      : { baseSha: raw.diff_refs.base_sha }),
    reason,
  }
}

function labelQuery(labels: readonly string[]): Query {
  return labels.length === 0 ? {} : { labels: labels.join(",") }
}

function toReviewer(user: GitlabUser, approved: ReadonlySet<string>): Reviewer {
  const login = user.username ?? ""
  return {
    login,
    name: user.name,
    avatarUrl: user.avatar_url ?? "",
    state: approved.has(login.toLowerCase()) ? "approved" : "pending",
  }
}

function toReviewSummary(raw: GitlabMergeRequest, approvals: GitlabApprovals): ReviewSummary {
  const approvers = (approvals.approved_by ?? [])
    .map((entry) => entry.user)
    .filter((user): user is GitlabUser => user !== undefined)
  const approved = new Set(
    approvers
      .map((user) => (user.username ?? "").toLowerCase())
      .filter((login) => login !== ""),
  )
  const listed = (raw.reviewers ?? []).map((user) => toReviewer(user, approved))
  const extra = approvers.map((user) => toReviewer(user, approved))
  return {
    author: {
      login: raw.author?.username ?? "unknown",
      name: raw.author?.name,
      avatarUrl: raw.author?.avatar_url ?? "",
    },
    reviewers: mergeReviewers([...listed, ...extra]),
  }
}

function fileStatus(file: NonNullable<GitlabComparison["diffs"]>[number]): string {
  if (file.new_file === true) return "added"
  if (file.deleted_file === true) return "removed"
  if (file.renamed_file === true) return "renamed"
  return "modified"
}

function toComparison(raw: GitlabComparison): Comparison {
  return {
    commits: raw.commits?.length ?? 0,
    files: (raw.diffs ?? []).map((file) => ({
      path: file.new_path ?? file.old_path ?? "",
      status: fileStatus(file),
      previousPath: file.renamed_file === true ? file.old_path : undefined,
      patch: file.diff === "" ? undefined : file.diff,
    })),
  }
}

function isDraft(mergeRequest: GitlabMergeRequest): boolean {
  return mergeRequest.draft ?? mergeRequest.work_in_progress ?? false
}

function isOpenAndReady(mergeRequest: GitlabMergeRequest): boolean {
  return HISTORY_STATES[mergeRequest.state ?? ""] === "open" && !isDraft(mergeRequest)
}

function resolveAvatar(avatarUrl: string | null | undefined, webRoot: string): string {
  return avatarUrl === null || avatarUrl === undefined || avatarUrl === "" ? "" : new URL(avatarUrl, webRoot).toString()
}

function toDiscussion(notes: GitlabActivity["notes"]): PullRequestHistory["discussion"] {
  return notes
    .filter((note) => !note.system || REVIEW_NOTE_PATTERN.test(note.body))
    .map((note) => ({ login: note.author.username ?? "", at: note.created_at }))
}

function toHistory(mergeRequest: GitlabMergeRequest, activity: GitlabActivity, webRoot: string): PullRequestHistory {
  return {
    number: mergeRequest.iid,
    title: mergeRequest.title,
    headBranch: mergeRequest.source_branch ?? "",
    state: HISTORY_STATES[mergeRequest.state ?? ""] ?? "closed",
    isDraft: isDraft(mergeRequest),
    author: {
      login: mergeRequest.author?.username ?? "unknown",
      name: mergeRequest.author?.name,
      avatarUrl: resolveAvatar(mergeRequest.author?.avatar_url, webRoot),
    },
    createdAt: mergeRequest.created_at ?? mergeRequest.updated_at,
    updatedAt: mergeRequest.updated_at,
    requestedReviewers: (mergeRequest.reviewers ?? []).flatMap((reviewer) => reviewer.username ?? []),
    discussion: toDiscussion(activity.notes),
    commitDates: activity.commitDates,
  }
}

const APPROVAL_NOTE_PATTERN = /^approved/i
const GRAPHQL_SUFFIX = "/api/graphql"
const LINE_CODE_SEPARATOR = "_"

function sideOf(point: { old_line?: number | null, new_line?: number | null }): DiffSide {
  return point.new_line === null || point.new_line === undefined ? "old" : "new"
}

function lineOn(point: { old_line?: number | null, new_line?: number | null } | undefined, side: DiffSide): number | null {
  return (side === "old" ? point?.old_line : point?.new_line) ?? null
}

function toThreadPosition(note: GitlabDiscussionNote): DiffPosition | null {
  const position = note.position
  if (position === null || position === undefined) return null
  const side = sideOf(position)
  const endLine = lineOn(position, side)
  const path = (side === "old" ? position.old_path : position.new_path) ?? position.new_path ?? position.old_path ?? ""
  if (endLine === null || path === "") return null
  return { path, side, startLine: lineOn(position.line_range?.start, side) ?? endLine, endLine }
}

function toDiscussionComment(note: GitlabDiscussionNote, webUrl: string, webRoot: string): DiscussionComment {
  return {
    id: String(note.id),
    author: toPerson(note.author, webRoot),
    body: note.body,
    createdAt: note.created_at,
    url: `${webUrl}#note_${String(note.id)}`,
  }
}

function isDiffNote(note: GitlabDiscussionNote | undefined): note is GitlabDiscussionNote {
  return note?.position !== null && note?.position !== undefined
}

function toReviewThread(discussion: GitlabDiscussion, webUrl: string, webRoot: string): ReviewThread[] {
  const [first] = discussion.notes
  if (!isDiffNote(first)) return []
  const position = toThreadPosition(first)
  return [{
    id: discussion.id,
    path: position?.path ?? first.position?.new_path ?? first.position?.old_path ?? "",
    position,
    isResolved: first.resolved ?? false,
    isOutdated: false,
    comments: discussion.notes
      .filter((note) => note.system !== true)
      .map((note) => toDiscussionComment(note, webUrl, webRoot)),
  }]
}

function toSubmittedReview(note: GitlabDiscussionNote, webUrl: string, webRoot: string): SubmittedReview {
  return {
    id: String(note.id),
    author: toPerson(note.author, webRoot),
    verdict: APPROVAL_NOTE_PATTERN.test(note.body) ? "approve" : "request-changes",
    body: "",
    submittedAt: note.created_at,
    url: `${webUrl}#note_${String(note.id)}`,
  }
}

function toPullRequestDiscussion(discussions: readonly GitlabDiscussion[], webUrl: string, webRoot: string): PullRequestDiscussion {
  const generalNotes = discussions.filter((discussion) => !isDiffNote(discussion.notes[0])).flatMap((discussion) => discussion.notes)
  return {
    comments: generalNotes.filter((note) => note.system !== true).map((note) => toDiscussionComment(note, webUrl, webRoot)),
    threads: discussions.flatMap((discussion) => toReviewThread(discussion, webUrl, webRoot)),
    reviews: generalNotes
      .filter((note) => note.system === true && REVIEW_NOTE_PATTERN.test(note.body))
      .map((note) => toSubmittedReview(note, webUrl, webRoot)),
  }
}

function lineCodeOf(path: string, line: DiffLine): string {
  return [gitlabDiffAnchor(path), String(line.oldLine ?? line.oldCursor), String(line.newLine ?? line.newCursor)].join(LINE_CODE_SEPARATOR)
}

function linesOf(line: DiffLine): { old_line?: number, new_line?: number } {
  return {
    ...(line.oldLine === null ? {} : { old_line: line.oldLine }),
    ...(line.newLine === null ? {} : { new_line: line.newLine }),
  }
}

function toLinePoint(path: string, side: DiffSide, line: DiffLine): GitlabLinePoint {
  return { line_code: lineCodeOf(path, line), type: side, ...linesOf(line) }
}

interface DiffRefs { base_sha: string, start_sha: string, head_sha: string }

interface PositionedComment { body: string, position: GitlabDiffPosition }

function diffRefsOf(mergeRequest: GitlabMergeRequest): DiffRefs {
  const { base_sha: base, start_sha: start, head_sha: head } = mergeRequest.diff_refs ?? {}
  if (base === undefined || head === undefined) {
    throw new GitAdapterError(`GitLab did not say which commits !${String(mergeRequest.iid)} compares.`)
  }
  return { base_sha: base, start_sha: start ?? base, head_sha: head }
}

function toDiffPosition(
  { position }: DraftComment,
  refs: DiffRefs,
  linesByPath: ReadonlyMap<string, readonly DiffLine[]>,
): GitlabDiffPosition {
  const ends = findPositionEnds(linesByPath, position)
  if (ends === null) {
    throw new GitAdapterError(`${position.path} has no such line in the diff of this merge request.`, "unsupported")
  }
  return {
    position_type: "text",
    ...refs,
    old_path: position.path,
    new_path: position.path,
    ...linesOf(ends.end),
    ...(position.startLine === position.endLine
      ? {}
      : {
          line_range: {
            start: toLinePoint(position.path, position.side, ends.start),
            end: toLinePoint(position.path, position.side, ends.end),
          },
        }),
  }
}

function toPerson(user: GitlabUser, webRoot: string): Person {
  return { login: user.username ?? "", name: user.name, avatarUrl: resolveAvatar(user.avatar_url, webRoot) }
}

function uniqueAuthors(authors: readonly string[]): string[] {
  return authors
    .map((author) => author.replace(AUTHOR_HANDLE_PREFIX, ""))
    .filter((author) => author !== "")
    .filter((author, position, all) => all.findIndex((other) => other.toLowerCase() === author.toLowerCase()) === position)
}

function withoutDuplicateIids(mergeRequests: readonly GitlabMergeRequest[]): GitlabMergeRequest[] {
  return mergeRequests.filter(
    (mergeRequest, position) => mergeRequests.findIndex((other) => other.iid === mergeRequest.iid) === position,
  )
}

function isMissingLocally(cause: unknown): boolean {
  return cause instanceof GitAdapterError && cause.problem === "no-repo"
}

function describeBlobFailure(
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

export interface GitlabAdapterOptions {
  token: string
  repo?: string
  root?: string
  baseUrl?: string
  provider?: ExtendedGitLabProvider
  environment?: Readonly<Record<string, string | undefined>>
}

export class GitlabAdapter extends BaseGitAdapter {
  override readonly id: GitAdapterId = "gitlab"
  override readonly name: string = "GitLab"
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

  private readonly baseUrl: string
  private readonly provider: ExtendedGitLabProvider
  private usernameLookup: Promise<string | null> | null = null

  constructor({ token, baseUrl = "", provider, ...options }: GitlabAdapterOptions) {
    super(options)
    this.baseUrl = baseUrl
    this.provider = provider ?? new ExtendedGitLabProvider({ token, baseURL: gitlabApiRoot(baseUrl) })
  }

  override reviewFilters(): readonly ReviewFilterOption[] {
    return REVIEW_FILTERS
  }

  override async listTargets(options: ListOptions): Promise<ReviewTarget[]> {
    const limit = Math.min(options.limit ?? DEFAULT_LIST_LIMIT, MAX_PAGE_SIZE)
    const labels = options.filter?.labels ?? []
    const customQuery = options.query?.trim() ?? ""

    const pinned = Promise.all(
      (options.pinned ?? [])
        .filter((ref) => ref.kind === "pr")
        .map(async (ref) => this.target(ref).catch(() => null)),
    )

    const base: Query = {
      state: "opened",
      order_by: "updated_at",
      sort: "desc",
      per_page: limit,
    }
    const reviewQuery: Query = {
      ...base,
      ...(await this.filterQuery(options)),
      ...(customQuery === "" ? {} : { search: customQuery }),
    }
    const searchGroups = await Promise.all([
      this.search(reviewQuery, "review-requested"),
      ...(options.includeMine === false
        ? []
        : [
            this.search(
              { ...base, scope: "created_by_me", ...labelQuery(labels) },
              "mine",
            ),
          ]),
    ])

    const pinnedTargets = (await pinned).filter(
      (row): row is ReviewTarget => row !== null,
    )
    return mergeTargets(searchGroups, pinnedTargets)
  }

  override async target(ref: TargetRef): Promise<ReviewTarget | null> {
    if (ref.kind === "branch") return super.target(ref)
    const raw = await this.mergeRequest(mergeRequestIid(ref))
    if ((raw.state ?? "").toLowerCase() !== "opened") return null
    return toTarget(raw, "pinned")
  }

  override async listLabels(): Promise<string[]> {
    const { owner, name } = splitRepo(this.repo)
    const labels = await orThrowGitAdapterError(
      this.provider.listLabelNames(owner, name, MAX_PAGE_SIZE),
    )
    return labels.filter((label) => label !== "").sort((a, b) => a.localeCompare(b))
  }

  override async reviewers(ref: TargetRef): Promise<ReviewSummary> {
    const { owner, name } = splitRepo(this.repo)
    const { mergeRequest, approvals } = await orThrowGitAdapterError(
      this.provider.readReviewers(owner, name, mergeRequestIid(ref)),
    )
    return toReviewSummary(mergeRequest, approvals)
  }

  override async headSha(ref: TargetRef): Promise<string> {
    if (ref.kind === "branch") return super.headSha(ref)
    const iid = mergeRequestIid(ref)
    const sha = (await this.mergeRequest(iid)).sha ?? ""
    if (sha === "") {
      throw new GitAdapterError(`Could not find the head commit of !${String(iid)}.`)
    }
    return sha
  }

  override async diff(ref: TargetRef): Promise<string> {
    if (ref.kind === "branch") return super.diff(ref)
    const { owner, name } = splitRepo(this.repo)
    return orThrowGitAdapterError(
      this.provider.readMergeRequestDiff(owner, name, mergeRequestIid(ref)),
    )
  }

  override async compare(base: string, head: string): Promise<Comparison> {
    try {
      return await super.compare(base, head)
    } catch (cause) {
      if (!isMissingLocally(cause)) throw cause
    }
    const { owner, name } = splitRepo(this.repo)
    const raw = await orThrowGitAdapterError(
      this.provider.compareWithDiffs(owner, name, base, head),
    )
    return toComparison(raw)
  }

  override async blob(path: string, sha: string): Promise<string> {
    try {
      return await super.blob(path, sha)
    } catch (cause) {
      if (!isMissingLocally(cause)) throw cause
    }
    try {
      return await readFileAt(this.provider, this.repo, path, sha)
    } catch (cause) {
      const error = toGitAdapterError(cause)
      throw new GitAdapterError(
        describeBlobFailure(path, this.repo, sha, error),
        error.problem,
      )
    }
  }

  override async viewer(): Promise<Person> {
    const user = await orThrowGitAdapterError(this.provider.readViewer())
    return { login: user.username ?? "", name: user.name, avatarUrl: user.avatar_url ?? "" }
  }

  override async searchPeople(query: string): Promise<Person[]> {
    const { owner, name } = splitRepo(this.repo)
    const typedText = query.trim()
    const webRoot = gitlabWebRoot(this.baseUrl)
    const [members, mergeRequests] = await Promise.all([
      orThrowGitAdapterError(this.provider.listProjectMembers(owner, name, typedText, MEMBER_LIMIT)),
      orThrowGitAdapterError(
        this.provider.listMergeRequests(owner, name, {
          state: "all",
          scope: "all",
          order_by: "updated_at",
          sort: "desc",
          per_page: MAX_PAGE_SIZE,
        }),
      ),
    ])
    const authors = mergeRequests.flatMap((mergeRequest) => mergeRequest.author ?? []).map((user) => toPerson(user, webRoot))
    return mergePeople([...members.map((user) => toPerson(user, webRoot)), ...matchPeople(authors, typedText)])
  }

  override async listPullRequests(options: HistoryOptions): Promise<PullRequestHistory[]> {
    const { owner, name } = splitRepo(this.repo)
    const lists = await Promise.all(
      uniqueAuthors(options.authors).map(async (author) =>
        orThrowGitAdapterError(
          this.provider.listMergeRequests(owner, name, {
            author_username: author,
            state: "all",
            scope: "all",
            order_by: "updated_at",
            sort: "desc",
            per_page: Math.min(options.limit, MAX_PAGE_SIZE),
          }),
        ),
      ),
    )
    return await Promise.all(
      withoutDuplicateIids(lists.flat()).map(async (mergeRequest) => this.toMergeRequestHistory(mergeRequest)),
    )
  }

  override reviewVerdicts(): readonly ReviewVerdict[] {
    return REVIEW_VERDICTS
  }

  override async discussion(ref: TargetRef): Promise<PullRequestDiscussion> {
    const { owner, name } = splitRepo(this.repo)
    const iid = mergeRequestIid(ref)
    const [mergeRequest, discussions] = await Promise.all([
      this.mergeRequest(iid),
      orThrowGitAdapterError(this.provider.readDiscussions(owner, name, iid)),
    ])
    return toPullRequestDiscussion(discussions, mergeRequest.web_url, gitlabWebRoot(this.baseUrl))
  }

  override async submitReview(ref: TargetRef, submission: ReviewSubmission): Promise<void> {
    const { owner, name } = splitRepo(this.repo)
    const iid = mergeRequestIid(ref)
    const positioned = await this.positionedCommentsOf(iid, submission.comments)
    await positioned.reduce(
      async (earlier, { body, position }) => {
        await earlier
        await orThrowRefusal(this.provider.postDiffDiscussion(owner, name, iid, body, position))
      },
      Promise.resolve(),
    )
    if (submission.body.trim() !== "") await orThrowRefusal(this.provider.postNote(owner, name, iid, submission.body))
    if (submission.verdict === "approve") await orThrowRefusal(this.provider.approveMergeRequest(owner, name, iid))
    if (submission.verdict === "request-changes") {
      await orThrowRefusal(this.provider.requestChanges(this.graphqlPath(), owner, name, iid))
    }
  }

  override async addComment(ref: TargetRef, body: string): Promise<void> {
    const { owner, name } = splitRepo(this.repo)
    await orThrowRefusal(this.provider.postNote(owner, name, mergeRequestIid(ref), body))
  }

  override async replyToThread(ref: TargetRef, threadId: string, body: string): Promise<void> {
    const { owner, name } = splitRepo(this.repo)
    await orThrowRefusal(this.provider.postDiscussionReply(owner, name, mergeRequestIid(ref), threadId, body))
  }

  override async resolveThread(ref: TargetRef, threadId: string): Promise<void> {
    const { owner, name } = splitRepo(this.repo)
    await orThrowRefusal(this.provider.markDiscussionResolved(owner, name, mergeRequestIid(ref), threadId, true))
  }

  override async reopenThread(ref: TargetRef, threadId: string): Promise<void> {
    const { owner, name } = splitRepo(this.repo)
    await orThrowRefusal(this.provider.markDiscussionResolved(owner, name, mergeRequestIid(ref), threadId, false))
  }

  override async searchReviewers(ref: TargetRef, query: string): Promise<Person[]> {
    mergeRequestIid(ref)
    const { owner, name } = splitRepo(this.repo)
    const members = await orThrowGitAdapterError(this.provider.listProjectMembers(owner, name, query.trim(), MEMBER_LIMIT))
    return mergePeople(members.map((user) => toPerson(user, gitlabWebRoot(this.baseUrl))))
  }

  override async requestReviewers(ref: TargetRef, logins: readonly string[]): Promise<void> {
    const iid = mergeRequestIid(ref)
    const { owner, name } = splitRepo(this.repo)
    const reviewers = (await this.mergeRequest(iid)).reviewers ?? []
    const reviewerLogins = new Set(reviewers.map((reviewer) => normalizeLogin(reviewer.username ?? "")))
    const isReviewer = (login: string): boolean => reviewerLogins.has(normalizeLogin(login))
    const added = await Promise.all(logins.filter((login) => !isReviewer(login)).map(async (login) => await this.userIdOf(login)))
    if (added.length > 0) await this.setReviewers(iid, [...new Set([...reviewers.flatMap((reviewer) => reviewer.id ?? []), ...added])])
    await logins.filter(isReviewer).reduce(
      async (earlier, login) => {
        await earlier
        await orThrowRefusal(this.provider.requestReviewAgain(owner, name, iid, normalizeLogin(login)))
      },
      Promise.resolve(),
    )
  }

  override async removeReviewRequests(ref: TargetRef, logins: readonly string[]): Promise<void> {
    const iid = mergeRequestIid(ref)
    const removed = new Set(logins.map(normalizeLogin))
    const kept = ((await this.mergeRequest(iid)).reviewers ?? [])
      .filter((reviewer) => !removed.has(normalizeLogin(reviewer.username ?? "")))
      .flatMap((reviewer) => reviewer.id ?? [])
    await this.setReviewers(iid, kept)
  }

  override permalink(ref: TargetRef, path: string): string {
    return (
      `${gitlabWebRoot(this.baseUrl)}/${this.repo}/-/merge_requests/`
      + `${String(mergeRequestIid(ref))}/diffs#${gitlabDiffAnchor(path)}`
    )
  }

  private async toMergeRequestHistory(mergeRequest: GitlabMergeRequest): Promise<PullRequestHistory> {
    const { owner, name } = splitRepo(this.repo)
    const activity = isOpenAndReady(mergeRequest)
      ? await orThrowGitAdapterError(
          this.provider.readMergeRequestActivity(owner, name, mergeRequest.iid, ACTIVITY_PAGE_SIZE),
        )
      : NO_ACTIVITY
    return toHistory(mergeRequest, activity, gitlabWebRoot(this.baseUrl))
  }

  protected graphqlPath(): string {
    return `${gitlabWebRoot(this.baseUrl)}${GRAPHQL_SUFFIX}`
  }

  private async positionedCommentsOf(iid: number, comments: readonly DraftComment[]): Promise<PositionedComment[]> {
    if (comments.length === 0) return []
    const { owner, name } = splitRepo(this.repo)
    const [mergeRequest, diff] = await Promise.all([
      this.mergeRequest(iid),
      orThrowGitAdapterError(this.provider.readMergeRequestDiff(owner, name, iid)),
    ])
    const refs = diffRefsOf(mergeRequest)
    const linesByPath = diffLinesByPath(diff)
    return comments.map((comment) => ({ body: comment.body, position: toDiffPosition(comment, refs, linesByPath) }))
  }

  private async userIdOf(login: string): Promise<number> {
    const users = await orThrowGitAdapterError(this.provider.findUsersByUsername(normalizeLogin(login)))
    const id = users.find((user) => normalizeLogin(user.username ?? "") === normalizeLogin(login))?.id
    if (id === undefined) throw new GitAdapterError(`${this.name} has no user named ${login}.`)
    return id
  }

  private async setReviewers(iid: number, reviewerIds: readonly number[]): Promise<void> {
    const { owner, name } = splitRepo(this.repo)
    await orThrowRefusal(this.provider.setReviewerIds(owner, name, iid, reviewerIds))
  }

  private async mergeRequest(iid: number): Promise<GitlabMergeRequest> {
    const { owner, name } = splitRepo(this.repo)
    return orThrowGitAdapterError(this.provider.readMergeRequest(owner, name, iid))
  }

  private async search(query: Query, reason: ReviewTarget["reason"]): Promise<ReviewTarget[]> {
    const { owner, name } = splitRepo(this.repo)
    const raw = await orThrowGitAdapterError(
      this.provider.listMergeRequests(owner, name, query),
    )
    return raw.map((item) => toTarget(item, reason))
  }

  private async filterQuery(options: ListOptions): Promise<Query> {
    const filter = options.filter ?? { review: [], labels: [] }
    const fromKeys = await Promise.all(
      filter.review.map(async (key) => this.queryForReviewKey(key)),
    )
    return [...fromKeys, labelQuery(filter.labels)].reduce<Query>((merged, part) => ({ ...merged, ...part }), {})
  }

  private async queryForReviewKey(key: string): Promise<Query> {
    switch (key) {
      case "assigned-to-me":
        return { scope: "assigned_to_me" }
      case "created-by-me":
        return { scope: "created_by_me" }
      case "not-draft":
        return { wip: "no" }
      case "awaiting-my-review": {
        const username = await this.currentUsername()
        return username === null ? {} : { reviewer_username: username }
      }
      default:
        return {}
    }
  }

  private async currentUsername(): Promise<string | null> {
    this.usernameLookup ??= this.provider.users
      .authenticated()
      .then((user) => user.login)
      .catch(() => null)
    return this.usernameLookup
  }
}
