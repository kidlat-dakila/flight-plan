import type {
  ChangedFile,
  ChangedFileStatus,
  Comment,
  CommitSummary,
  Issue,
  IssueState,
  ListOptions,
  Owner,
  PageResult,
  PullRequest,
  Repository,
  Thread,
  ThreadComment,
  User,
} from "@agntn/forges"
import type {
  RawAccount,
  RawComment,
  RawCommit,
  RawDiffstat,
  RawIssue,
  RawPage,
  RawPullRequest,
  RawRepository,
  RawThread,
  RawWorkspace,
} from "./bitbucket-raw"

const IDENTITY_PATTERN = /^(.*?)\s*<([^>]*)>$/
const CLONE_PROTOCOL = "https"
const OPEN_ISSUE_STATES = ["new", "open", "submitted", "on hold"]
const CLOSED_ISSUE_STATES = ["resolved", "invalid", "duplicate", "wontfix", "closed"]
const DIFFSTAT_STATUSES: Readonly<Record<string, ChangedFileStatus>> = {
  added: "added",
  modified: "modified",
  removed: "removed",
  renamed: "renamed",
}

export function handleOf(user: RawAccount | undefined): string {
  return user?.nickname ?? user?.display_name ?? ""
}

function avatarOf(user: { links?: { avatar?: { href?: string } } } | undefined): string {
  return user?.links?.avatar?.href ?? ""
}

function identityOf(raw: string | undefined, date: string | undefined) {
  const match = IDENTITY_PATTERN.exec(raw ?? "")
  return { name: match?.[1] ?? raw ?? "", email: match?.[2] ?? "", date: date ?? "" }
}

export function pageOf<T>(page: RawPage, items: T[], number: number): PageResult<T> {
  return {
    items,
    ...(page.size === undefined ? {} : { totalCount: page.size }),
    hasNextPage: page.next !== undefined,
    ...(page.next === undefined ? {} : { nextPage: number + 1 }),
  }
}

export function pageOfSlice<T>(items: readonly T[], page: number, perPage: number): PageResult<T> {
  const start = (page - 1) * perPage
  const end = start + perPage
  return {
    items: items.slice(start, end),
    totalCount: items.length,
    hasNextPage: end < items.length,
    ...(end < items.length ? { nextPage: page + 1 } : {}),
  }
}

export function toCommitSummary(raw: RawCommit): CommitSummary {
  const identity = identityOf(raw.author?.raw, raw.date)
  return {
    sha: raw.hash,
    message: raw.message ?? "",
    author: identity,
    committer: identity,
    parents: (raw.parents ?? []).map((parent) => parent.hash),
    url: raw.links?.html?.href ?? "",
  }
}

export function toChangedFile(raw: RawDiffstat): ChangedFile {
  return {
    path: raw.new?.path ?? raw.old?.path ?? "",
    status: DIFFSTAT_STATUSES[raw.status ?? ""] ?? "unknown",
    additions: raw.lines_added ?? null,
    deletions: raw.lines_removed ?? null,
  }
}

export function toPullRequest(raw: RawPullRequest): PullRequest {
  return {
    id: String(raw.id),
    number: raw.id,
    title: raw.title ?? "",
    body: raw.description ?? "",
    state: raw.state === "OPEN" ? "open" : "closed",
    labels: [],
    author: { login: handleOf(raw.author) },
    assignees: [],
    createdAt: raw.created_on ?? "",
    updatedAt: raw.updated_on ?? "",
    url: raw.links?.html?.href ?? "",
    merged: raw.state === "MERGED",
    draft: raw.draft ?? false,
    sourceBranch: raw.source?.branch?.name ?? "",
    targetBranch: raw.destination?.branch?.name ?? "",
    mergeCommitSha: raw.merge_commit?.hash ?? "",
    mergedAt: null,
    mergedBy: null,
    headSha: raw.source?.commit?.hash ?? "",
    mergeable: null,
    mergeStatus: "",
  }
}

export function toOwner(raw: RawWorkspace): Owner {
  return { login: raw.slug ?? "", avatarUrl: avatarOf(raw) }
}

function workspaceSlugOf(fullName: string): string {
  const separator = fullName.indexOf("/")
  return separator === -1 ? fullName : fullName.slice(0, separator)
}

export function toRepository(raw: RawRepository): Repository {
  const cloneLink = (raw.links?.clone ?? []).find((link) => link.name === CLONE_PROTOCOL)
  return {
    id: raw.uuid ?? raw.full_name,
    name: raw.name ?? "",
    fullName: raw.full_name,
    description: raw.description ?? "",
    private: raw.is_private ?? false,
    defaultBranch: raw.mainbranch?.name ?? "",
    url: raw.links?.html?.href ?? "",
    cloneUrl: cloneLink?.href ?? "",
    isFork: raw.parent !== null && raw.parent !== undefined,
    parent:
      raw.parent === null || raw.parent === undefined
        ? null
        : { fullName: raw.parent.full_name ?? "", url: raw.parent.links?.html?.href ?? "" },
    viewerPermission: null,
    owner: toOwner({
      slug: raw.workspace?.slug ?? workspaceSlugOf(raw.full_name),
      links: raw.workspace?.links ?? raw.owner?.links,
    }),
  }
}

function issueStateOf(raw: string | undefined): IssueState {
  return CLOSED_ISSUE_STATES.includes(raw ?? "") ? "closed" : "open"
}

export function toIssue(raw: RawIssue): Issue {
  const assigneeLogin = handleOf(raw.assignee ?? undefined)
  return {
    id: String(raw.id),
    number: raw.id,
    title: raw.title ?? "",
    body: raw.content?.raw ?? "",
    state: issueStateOf(raw.state),
    labels: [],
    author: { login: handleOf(raw.reporter) },
    assignees: assigneeLogin === "" ? [] : [{ login: assigneeLogin }],
    createdAt: raw.created_on ?? "",
    updatedAt: raw.updated_on ?? raw.created_on ?? "",
    url: raw.links?.html?.href ?? "",
  }
}

export function issueStateFilter(state: ListOptions["state"]): string | null {
  if (state === "all") return null
  const states = state === "closed" ? CLOSED_ISSUE_STATES : OPEN_ISSUE_STATES
  return states.map((name) => `state="${name}"`).join(" OR ")
}

export function toUser(raw: RawAccount): User {
  return {
    id: raw.account_id ?? raw.uuid ?? "",
    login: handleOf(raw),
    name: raw.display_name ?? "",
    email: "",
    avatarUrl: avatarOf(raw),
    isAdmin: false,
    bio: "",
    company: "",
    location: "",
    website: "",
    followers: 0,
    following: 0,
    createdAt: raw.created_on ?? "",
    url: raw.links?.html?.href ?? "",
  }
}

export function toComment(raw: RawComment): Comment {
  return {
    id: String(raw.id),
    body: raw.content?.raw ?? "",
    author: { login: handleOf(raw.user) },
    url: raw.links?.html?.href ?? "",
    createdAt: raw.created_on ?? "",
    updatedAt: raw.updated_on ?? raw.created_on ?? "",
  }
}

export function toThreadComment(raw: RawComment): ThreadComment {
  return {
    id: String(raw.id),
    body: raw.content?.raw ?? "",
    author: { login: handleOf(raw.user) },
    url: raw.links?.html?.href ?? "",
    createdAt: raw.created_on ?? "",
  }
}

export function toThread(raw: RawThread): Thread {
  const inline = raw.root.inline
  return {
    id: String(raw.root.id),
    isResolved: raw.root.resolution !== null && raw.root.resolution !== undefined,
    isOutdated: inline?.outdated ?? false,
    path: inline?.path ?? "",
    line: inline?.to ?? inline?.from ?? null,
    startLine: inline?.start_to ?? inline?.start_from ?? null,
    comments: [raw.root, ...raw.replies].map(toThreadComment),
  }
}

function rootIdOf(comment: RawComment, commentsById: ReadonlyMap<number, RawComment>): number {
  if (comment.parent === undefined) return comment.id
  const parent = commentsById.get(comment.parent.id)
  return parent === undefined ? comment.parent.id : rootIdOf(parent, commentsById)
}

function isLive(comment: RawComment): boolean {
  return comment.deleted !== true
}

export function groupThreads(comments: readonly RawComment[]): RawThread[] {
  const commentsById = new Map(comments.map((comment): [number, RawComment] => [comment.id, comment]))
  const liveComments = comments.filter(isLive)
  return liveComments
    .filter((comment) => comment.parent === undefined)
    .map((root) => ({
      root,
      replies: [
        ...liveComments.filter((comment) => comment.parent !== undefined && rootIdOf(comment, commentsById) === root.id),
      ].sort((left, right) => left.id - right.id),
    }))
}

export function pagingQuery(
  page: number,
  perPage: number,
  extra: readonly (readonly [string, string])[] = [],
): URLSearchParams {
  const pairs = extra.map(([name, value]): [string, string] => [name, value])
  return new URLSearchParams([...pairs, ["pagelen", String(perPage)], ["page", String(page)]])
}
