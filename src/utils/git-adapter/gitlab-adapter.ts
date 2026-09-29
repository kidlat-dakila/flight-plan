import * as crypto from "node:crypto"
import {
  ExtendedGitLabProvider,
  type GitlabApprovals,
  type GitlabComparison,
  type GitlabMergeRequest,
  type GitlabUser,
} from "./custom-providers/extended-gitlab-provider"
import {
  orThrowGitAdapterError,
  readFileAt,
  splitRepo,
  toGitAdapterError,
} from "./forges-provider"
import { mergeTargets } from "./merge-targets"
import {
  GitAdapterError,
  mergeReviewers,
  type Capability,
  type Comparison,
  type LineRange,
  type ListOptions,
  type ReviewFilterOption,
  type Reviewer,
  type ReviewSummary,
  type ReviewTarget,
  type TargetRef,
} from "../../lib/git-adapter/types"
import { BaseGitAdapter } from "./base"

const DEFAULT_LIST_LIMIT = 30
const MAX_PAGE_SIZE = 100
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

function isMissingLocally(cause: unknown): boolean {
  return cause instanceof GitAdapterError && cause.problem === "no-repo"
}

function describeBlobFailure(
  path: string,
  repo: string,
  sha: string,
  error: GitAdapterError,
): string {
  const shortSha = sha.slice(0, 8)
  return error.problem === "no-repo"
    ? `${path} is not in ${repo} at ${shortSha}. The walkthrough ` +
        `may have been written against a different commit, or the file ` +
        `was renamed.`
    : `${path} could not be read from ${repo} at ${shortSha}: ${error.message}`
}

export type GitlabAdapterOptions = {
  token: string
  repo?: string
  root?: string
  baseUrl?: string
}

export class GitlabAdapter extends BaseGitAdapter {
  override readonly id = "gitlab"
  override readonly name = "GitLab"
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
  ])

  private readonly baseUrl: string
  private readonly provider: ExtendedGitLabProvider
  private usernameLookup: Promise<string | null> | null = null

  constructor({ token, baseUrl = "", ...options }: GitlabAdapterOptions) {
    super(options)
    this.baseUrl = baseUrl
    this.provider = new ExtendedGitLabProvider({ token, baseURL: gitlabApiRoot(baseUrl) })
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
        .map((ref) => this.target(ref).catch(() => null)),
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

  override permalink(ref: TargetRef, path: string, _range?: LineRange): string {
    return (
      `${gitlabWebRoot(this.baseUrl)}/${this.repo}/-/merge_requests/` +
      `${String(mergeRequestIid(ref))}/diffs#${gitlabDiffAnchor(path)}`
    )
  }

  private mergeRequest(iid: number): Promise<GitlabMergeRequest> {
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
      filter.review.map((key) => this.queryForReviewKey(key)),
    )
    return Object.assign({}, ...fromKeys, labelQuery(filter.labels)) as Query
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

  private currentUsername(): Promise<string | null> {
    this.usernameLookup ??= this.provider.users
      .authenticated()
      .then((user) => user.login)
      .catch(() => null)
    return this.usernameLookup
  }
}
