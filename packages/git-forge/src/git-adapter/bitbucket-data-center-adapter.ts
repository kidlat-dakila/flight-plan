import {
  GitAdapterError,
  mergeReviewers,
  type Capability,
  type DiscussionActivity,
  type Fetcher,
  type HistoryOptions,
  type ListOptions,
  type Person,
  type PullRequestHistory,
  type Reviewer,
  type ReviewSummary,
  type ReviewTarget,
  type TargetRef,
} from "@/git-adapter/types"
import { BaseGitAdapter } from "./base"
import {
  BitbucketDataCenterClient,
  slugOf,
  type DataCenterActivityPage,
} from "./custom-providers/bitbucket-data-center-client"
import type {
  DataCenterParticipant,
  DataCenterPullRequest,
  DataCenterUser,
} from "./custom-providers/bitbucket-data-center-raw"
import { orThrowGitAdapterError } from "./forges-provider"
import { matchPeople, mergePeople } from "./helpers/people"
import { createRest } from "./helpers/rest"
import { mergeTargets } from "./merge-targets"

const DEFAULT_LIST_LIMIT = 30
const ACTIVITY_LIMIT = 50
const MEMBER_LIMIT = 20
const RECENT_AUTHOR_LIMIT = 50
const AUTHOR_HANDLE_PREFIX = "@"
const API_SUFFIX = "/rest/api/1.0"
const PROJECT_FROM_END = -2
const SLUG_FROM_END = -1
const NO_ACTIVITY: DataCenterActivityPage = { activities: [], commits: [] }
const REVIEW_ACTIONS: readonly string[] = ["COMMENTED", "APPROVED", "REVIEWED", "UNAPPROVED"]
const ADDED_COMMENT = "ADDED"
const HISTORY_STATES: Readonly<Record<string, PullRequestHistory["state"]>> = {
  OPEN: "open",
  MERGED: "merged",
  DECLINED: "closed",
}
const REVIEWER_STATES: Readonly<Record<string, Reviewer["state"]>> = {
  APPROVED: "approved",
  NEEDS_WORK: "changes-requested",
}

export function dataCenterWebRoot(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "")
  return trimmed.endsWith(API_SUFFIX) ? trimmed.slice(0, trimmed.length - API_SUFFIX.length) : trimmed
}

export function splitProject(repo: string): { project: string, slug: string } {
  const segments = repo.split("/")
  return { project: segments.at(PROJECT_FROM_END) ?? "", slug: segments.at(SLUG_FROM_END) ?? "" }
}

function pullRequestId(ref: TargetRef): number {
  if (ref.kind !== "pr") {
    throw new GitAdapterError("Bitbucket reads pull requests, and this row is a branch.", "unsupported")
  }
  return ref.number
}

function isoOf(epochMilliseconds: number | undefined): string {
  return epochMilliseconds === undefined ? "" : new Date(epochMilliseconds).toISOString()
}

function avatarOf(user: DataCenterUser | undefined, webRoot: string): string {
  return user?.avatarUrl === undefined || user.avatarUrl === "" ? "" : new URL(user.avatarUrl, `${webRoot}/`).toString()
}

function toPerson(user: DataCenterUser | undefined, webRoot: string): Person {
  return { login: slugOf(user) || "unknown", name: user?.displayName, avatarUrl: avatarOf(user, webRoot) }
}

function toTarget(raw: DataCenterPullRequest, reason: ReviewTarget["reason"]): ReviewTarget {
  return {
    ref: { kind: "pr", number: raw.id },
    title: raw.title ?? "",
    author: slugOf(raw.author?.user) || "unknown",
    url: raw.links?.self?.at(0)?.href ?? "",
    updatedAt: isoOf(raw.updatedDate),
    isDraft: raw.draft ?? false,
    ...(raw.toRef?.displayId === undefined ? {} : { baseRef: raw.toRef.displayId }),
    ...(raw.toRef?.latestCommit === undefined ? {} : { baseSha: raw.toRef.latestCommit }),
    reason,
  }
}

function toReviewer(participant: DataCenterParticipant, webRoot: string): Reviewer {
  return { ...toPerson(participant.user, webRoot), state: REVIEWER_STATES[participant.status ?? ""] ?? "pending" }
}

function toReviewSummary(raw: DataCenterPullRequest, webRoot: string): ReviewSummary {
  return {
    author: toPerson(raw.author?.user, webRoot),
    reviewers: mergeReviewers((raw.reviewers ?? []).map((participant) => toReviewer(participant, webRoot))),
  }
}

function isOpenAndReady(raw: DataCenterPullRequest): boolean {
  return HISTORY_STATES[raw.state ?? ""] === "open" && raw.draft !== true
}

function toDiscussion(activities: DataCenterActivityPage["activities"]): DiscussionActivity[] {
  return activities
    .filter((activity) => REVIEW_ACTIONS.includes(activity.action))
    .filter((activity) => activity.commentAction === undefined || activity.commentAction === ADDED_COMMENT)
    .flatMap((activity) => (activity.user === undefined ? [] : [{ login: slugOf(activity.user), at: isoOf(activity.createdDate) }]))
}

function toHistory(raw: DataCenterPullRequest, page: DataCenterActivityPage, webRoot: string): PullRequestHistory {
  return {
    number: raw.id,
    title: raw.title ?? "",
    headBranch: raw.fromRef?.displayId ?? "",
    state: HISTORY_STATES[raw.state ?? ""] ?? "closed",
    isDraft: raw.draft ?? false,
    author: toPerson(raw.author?.user, webRoot),
    createdAt: isoOf(raw.createdDate ?? raw.updatedDate),
    updatedAt: isoOf(raw.updatedDate),
    requestedReviewers: (raw.reviewers ?? []).map((participant) => slugOf(participant.user)).filter((login) => login !== ""),
    discussion: toDiscussion(page.activities),
    commitDates: page.commits.flatMap((commit) => commit.committerTimestamp ?? commit.authorTimestamp ?? []).map(isoOf),
  }
}

function withoutDuplicateIds(pullRequests: readonly DataCenterPullRequest[]): DataCenterPullRequest[] {
  return pullRequests.filter(
    (pullRequest, position) => pullRequests.findIndex((other) => other.id === pullRequest.id) === position,
  )
}

function uniqueLogins(authors: readonly string[]): string[] {
  return authors
    .map((author) => author.replace(AUTHOR_HANDLE_PREFIX, "").toLowerCase())
    .filter((author) => author !== "")
    .filter((author, position, all) => all.indexOf(author) === position)
}

export interface BitbucketDataCenterAdapterOptions {
  username: string
  token: string
  baseUrl: string
  repo?: string
  root?: string
  fetcher?: Fetcher
  environment?: Readonly<Record<string, string | undefined>>
}

export class BitbucketDataCenterAdapter extends BaseGitAdapter {
  override readonly id = "bitbucket"
  override readonly name = "Bitbucket Data Center"
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
  ])

  private readonly webRoot: string
  private readonly project: string
  private readonly slug: string
  private readonly client: BitbucketDataCenterClient

  constructor({ username, token, baseUrl, fetcher, ...options }: BitbucketDataCenterAdapterOptions) {
    super(options)
    this.webRoot = dataCenterWebRoot(baseUrl)
    const { project, slug } = splitProject(this.repo)
    this.project = project
    this.slug = slug
    const authorization = `Basic ${Buffer.from(`${username}:${token}`, "utf8").toString("base64")}`
    this.client = new BitbucketDataCenterClient({
      webRoot: this.webRoot,
      rest: createRest({
        baseUrl: `${this.webRoot}${API_SUFFIX}`,
        name: this.name,
        headers: { authorization, accept: "application/json" },
        fetcher,
      }),
    })
  }

  override async listTargets(options: ListOptions): Promise<ReviewTarget[]> {
    const pinned = Promise.all(
      (options.pinned ?? [])
        .filter((ref) => ref.kind === "pr")
        .map(async (ref) => this.target(ref).catch(() => null)),
    )
    const open = await orThrowGitAdapterError(
      this.client.listPullRequests(this.project, this.slug, { state: "OPEN", limit: options.limit ?? DEFAULT_LIST_LIMIT }),
    )
    const pinnedTargets = (await pinned).filter((row): row is ReviewTarget => row !== null)
    return mergeTargets([open.map((raw) => toTarget(raw, "review-requested"))], pinnedTargets)
  }

  override async target(ref: TargetRef): Promise<ReviewTarget | null> {
    if (ref.kind === "branch") return super.target(ref)
    const raw = await this.pullRequest(pullRequestId(ref))
    return raw.state === "OPEN" ? toTarget(raw, "pinned") : null
  }

  override async reviewers(ref: TargetRef): Promise<ReviewSummary> {
    return toReviewSummary(await this.pullRequest(pullRequestId(ref)), this.webRoot)
  }

  override async headSha(ref: TargetRef): Promise<string> {
    if (ref.kind === "branch") return super.headSha(ref)
    const id = pullRequestId(ref)
    const sha = (await this.pullRequest(id)).fromRef?.latestCommit ?? ""
    if (sha === "") throw new GitAdapterError(`Could not find the head commit of #${String(id)}.`)
    return sha
  }

  override async diff(ref: TargetRef): Promise<string> {
    if (ref.kind === "branch") return super.diff(ref)
    const raw = await this.pullRequest(pullRequestId(ref))
    const head = raw.fromRef?.latestCommit
    const base = raw.toRef?.latestCommit
    if (head === undefined || base === undefined) {
      throw new GitAdapterError(`Could not find the commits of #${String(raw.id)}.`)
    }
    return await this.diffBetween(base, head)
  }

  override async viewer(): Promise<Person> {
    return toPerson(await orThrowGitAdapterError(this.client.readViewer()), this.webRoot)
  }

  override async searchPeople(query: string): Promise<Person[]> {
    const typedText = query.trim()
    const [users, recent] = await Promise.all([
      orThrowGitAdapterError(this.client.searchUsers(typedText, MEMBER_LIMIT)),
      orThrowGitAdapterError(
        this.client.listPullRequests(this.project, this.slug, { state: "ALL", limit: RECENT_AUTHOR_LIMIT }),
      ),
    ])
    const authors = recent.map((raw) => toPerson(raw.author?.user, this.webRoot))
    return mergePeople([...users.map((user) => toPerson(user, this.webRoot)), ...matchPeople(authors, typedText)])
  }

  override async listPullRequests(options: HistoryOptions): Promise<PullRequestHistory[]> {
    const lists = await Promise.all(
      uniqueLogins(options.authors).map(async (authorSlug) =>
        await orThrowGitAdapterError(
          this.client.listPullRequests(this.project, this.slug, { state: "ALL", limit: options.limit, authorSlug }),
        ),
      ),
    )
    return await Promise.all(withoutDuplicateIds(lists.flat()).map(async (raw) => await this.toPullRequestHistory(raw)))
  }

  override permalink(ref: TargetRef, path: string): string {
    return `${this.webRoot}/projects/${this.project}/repos/${this.slug}/pull-requests/${String(pullRequestId(ref))}/diff#${path}`
  }

  private async toPullRequestHistory(raw: DataCenterPullRequest): Promise<PullRequestHistory> {
    const page = isOpenAndReady(raw)
      ? await orThrowGitAdapterError(this.client.readPullRequestActivity(this.project, this.slug, raw.id, ACTIVITY_LIMIT))
      : NO_ACTIVITY
    return toHistory(raw, page, this.webRoot)
  }

  private async pullRequest(id: number): Promise<DataCenterPullRequest> {
    return await orThrowGitAdapterError(this.client.readPullRequest(this.project, this.slug, id))
  }
}
