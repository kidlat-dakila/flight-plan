import { createBitbucketCloudClient } from "@natoboram/bitbucket.ts/cloud"
import {
  Provider,
  type CommitComparison,
  type CommitSummary,
  type CompareCommitsOptions,
  type ListOptions,
  type PageResult,
  type ProviderRawTypes,
  type PullRequest,
  type RepositoryContents,
  type RepositoryContentsOptions,
} from "@agntn/forges"
import { GitAdapterError } from "../../../lib/git-adapter/types"
import type { Rest } from "../helpers/rest"

export const BITBUCKET_API_ROOT = "https://api.bitbucket.org/2.0"
const DEFAULT_PAGE_SIZE = 30
const OPEN_STATES = ["OPEN"]
const CLOSED_STATES = ["MERGED", "DECLINED", "SUPERSEDED"]
const IDENTITY_PATTERN = /^(.*?)\s*<([^>]*)>$/

export type RawAccount = {
  display_name?: string
  nickname?: string
  links?: { avatar?: { href?: string } }
}

export type RawPullRequest = {
  id: number
  title?: string
  description?: string
  state?: string
  draft?: boolean
  created_on?: string
  updated_on?: string
  author?: RawAccount
  links?: { html?: { href?: string } }
  source?: { branch?: { name?: string }; commit?: { hash?: string } }
  destination?: { branch?: { name?: string }; commit?: { hash?: string } }
  merge_commit?: { hash?: string } | null
  participants?: {
    user?: RawAccount
    role?: string
    approved?: boolean
    state?: string | null
  }[]
}

type RawCommit = {
  hash: string
  message?: string
  date?: string
  author?: { raw?: string }
  parents?: { hash: string }[]
  links?: { html?: { href?: string } }
}

type RawPage<T> = { values?: T[]; size?: number; next?: string }

interface BitbucketRawTypes extends ProviderRawTypes {
  pullRequest: RawPullRequest
}

function statesFor(state: ListOptions["state"]): string[] {
  if (state === "closed") return CLOSED_STATES
  if (state === "all") return [...OPEN_STATES, ...CLOSED_STATES]
  return OPEN_STATES
}

function handleOf(user: RawAccount | undefined): string {
  return user?.nickname ?? user?.display_name ?? ""
}

function identityOf(raw: string | undefined, date: string | undefined) {
  const match = IDENTITY_PATTERN.exec(raw ?? "")
  return { name: match?.[1] ?? raw ?? "", email: match?.[2] ?? "", date: date ?? "" }
}

function toCommitSummary(raw: RawCommit): CommitSummary {
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

function pageOf<T>(page: RawPage<unknown>, items: T[], number: number): PageResult<T> {
  return {
    items,
    ...(page.size === undefined ? {} : { totalCount: page.size }),
    hasNextPage: page.next !== undefined,
    ...(page.next === undefined ? {} : { nextPage: number + 1 }),
  }
}

function dataOf<T>(result: { data?: unknown }): T {
  if (result.data === undefined) {
    throw new GitAdapterError("Bitbucket answered with nothing.")
  }
  return result.data as T
}

export type BitbucketForgeAdapterOptions = { rest: Rest }

export class BitbucketForgeAdapter extends Provider<BitbucketRawTypes> {
  private readonly rest: Rest
  private readonly client: ReturnType<typeof createBitbucketCloudClient>

  constructor({ rest }: BitbucketForgeAdapterOptions) {
    super()
    this.rest = rest
    this.client = createBitbucketCloudClient({
      baseUrl: BITBUCKET_API_ROOT,
      fetch: (request) =>
        rest.request(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
        }),
    })
  }

  async readPullRequest(owner: string, repo: string, id: number): Promise<RawPullRequest> {
    return dataOf<RawPullRequest>(
      await this.client.GET(
        "/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}",
        { params: { path: { workspace: owner, repo_slug: repo, pull_request_id: id } } },
      ),
    )
  }

  async readPullRequestDiff(owner: string, repo: string, id: number): Promise<string> {
    return dataOf<string>(
      await this.client.GET(
        "/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}/diff",
        {
          params: { path: { workspace: owner, repo_slug: repo, pull_request_id: id } },
          parseAs: "text",
        },
      ),
    )
  }

  async readCompareDiff(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<string> {
    return dataOf<string>(
      await this.client.GET("/repositories/{workspace}/{repo_slug}/diff/{spec}", {
        params: {
          path: { workspace: owner, repo_slug: repo, spec: `${base}..${head}` },
          query: { topic: true },
        },
        parseAs: "text",
      }),
    )
  }

  protected mapPullRequest(raw: RawPullRequest): PullRequest {
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

  protected async getPullRequest(
    owner: string,
    repo: string,
    number: number,
  ): Promise<PullRequest> {
    return this.mapPullRequest(await this.readPullRequest(owner, repo, number))
  }

  protected async listPullRequests(
    owner: string,
    repo: string,
    options?: ListOptions,
  ): Promise<PageResult<PullRequest>> {
    const page = options?.page ?? 1
    const query = new URLSearchParams()
    for (const state of statesFor(options?.state)) query.append("state", state)
    query.set("sort", "-updated_on")
    query.set("pagelen", String(options?.perPage ?? DEFAULT_PAGE_SIZE))
    query.set("page", String(page))
    const raw = await this.rest.json<RawPage<RawPullRequest>>(
      `${this.repoPath(owner, repo)}/pullrequests?${query.toString()}`,
    )
    return pageOf(raw, (raw.values ?? []).map((item) => this.mapPullRequest(item)), page)
  }

  protected async readRepositoryContents(
    owner: string,
    repo: string,
    path: string,
    options?: RepositoryContentsOptions,
  ): Promise<RepositoryContents> {
    const ref = options?.ref
    if (ref === undefined) {
      throw new GitAdapterError("Reading a file from Bitbucket needs a revision.")
    }
    const content = await this.rest.text(
      `${this.repoPath(owner, repo)}/src/${encodeURIComponent(ref)}/${encodeURI(path)}`,
    )
    const offset = options?.offset ?? 0
    const end =
      options?.maxChars === undefined
        ? content.length
        : Math.min(offset + options.maxChars, content.length)
    return {
      type: "file",
      path,
      sha: ref,
      size: Buffer.byteLength(content, "utf8"),
      binary: false,
      content: content.slice(offset, end),
      offset,
      nextOffset: end < content.length ? end : null,
      truncated: end < content.length,
    }
  }

  protected async compareCommits(
    owner: string,
    repo: string,
    base: string,
    head: string,
    options?: CompareCommitsOptions,
  ): Promise<CommitComparison> {
    const page = options?.page ?? 1
    const raw = await this.rest.json<RawPage<RawCommit>>(
      `${this.repoPath(owner, repo)}/commits?include=${encodeURIComponent(head)}` +
        `&exclude=${encodeURIComponent(base)}` +
        `&pagelen=${String(options?.perPage ?? DEFAULT_PAGE_SIZE)}&page=${String(page)}`,
    )
    const items = (raw.values ?? []).map(toCommitSummary).reverse()
    const totalCount = raw.size ?? items.length
    return {
      ...pageOf(raw, items, page),
      totalCount,
      status: null,
      aheadBy: totalCount,
      behindBy: null,
      mergeBaseSha: null,
      files: null,
      filesComplete: null,
    }
  }

  protected mapOwner(): never {
    return this.notSupported("map an owner")
  }
  protected mapRepository(): never {
    return this.notSupported("map a repository")
  }
  protected mapIssue(): never {
    return this.notSupported("map an issue")
  }
  protected mapUser(): never {
    return this.notSupported("map a user")
  }
  protected mapThread(): never {
    return this.notSupported("map a thread")
  }
  protected mapComment(): never {
    return this.notSupported("map a comment")
  }
  protected listRepos(): Promise<never> {
    return this.rejectUnsupported("list repositories")
  }
  protected getRepo(): Promise<never> {
    return this.rejectUnsupported("read a repository")
  }
  protected getCommit(): Promise<never> {
    return this.rejectUnsupported("read a commit")
  }
  protected listIssues(): Promise<never> {
    return this.rejectUnsupported("list issues")
  }
  protected getIssue(): Promise<never> {
    return this.rejectUnsupported("read an issue")
  }
  protected createIssue(): Promise<never> {
    return this.rejectUnsupported("create an issue")
  }
  protected createPullRequest(): Promise<never> {
    return this.rejectUnsupported("create a pull request")
  }
  protected listIssueComments(): Promise<never> {
    return this.rejectUnsupported("list issue comments")
  }
  protected listPullRequestComments(): Promise<never> {
    return this.rejectUnsupported("list pull request comments")
  }
  protected getIssueComment(): Promise<never> {
    return this.rejectUnsupported("read an issue comment")
  }
  protected getPullRequestComment(): Promise<never> {
    return this.rejectUnsupported("read a pull request comment")
  }
  protected getUser(): Promise<never> {
    return this.rejectUnsupported("read a user")
  }
  protected getAuthenticatedUser(): Promise<never> {
    return this.rejectUnsupported("read the signed-in user")
  }
  protected listThreads(): Promise<never> {
    return this.rejectUnsupported("list threads")
  }
  protected getThread(): Promise<never> {
    return this.rejectUnsupported("read a thread")
  }
  protected replyToThread(): Promise<never> {
    return this.rejectUnsupported("reply to a thread")
  }
  protected resolveThread(): Promise<never> {
    return this.rejectUnsupported("resolve a thread")
  }
  protected unresolveThread(): Promise<never> {
    return this.rejectUnsupported("reopen a thread")
  }

  private repoPath(owner: string, repo: string): string {
    return `repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  }

  private notSupported(action: string): never {
    throw this.unsupportedError(action)
  }

  private rejectUnsupported(action: string): Promise<never> {
    return Promise.reject(this.unsupportedError(action))
  }

  private unsupportedError(action: string): GitAdapterError {
    return new GitAdapterError(`The Bitbucket provider cannot ${action}.`, "unsupported")
  }
}
