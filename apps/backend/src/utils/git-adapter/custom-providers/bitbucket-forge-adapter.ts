import {
  Provider,
  type Comment,
  type Commit,
  type CommitComparison,
  type CompareCommitsOptions,
  type CreateCommentInput,
  type CreateIssueInput,
  type CreatePullRequestInput,
  type Issue,
  type ListCommentOptions,
  type ListOptions,
  type ListThreadOptions,
  type Owner,
  type PageResult,
  type ProviderRawTypes,
  type PullRequest,
  type Repository,
  type RepositoryContents,
  type RepositoryContentsOptions,
  type ReplyThreadInput,
  type Thread,
  type ThreadComment,
  type User,
} from "@agntn/forges"
import { createBitbucketCloudClient } from "@natoboram/bitbucket.ts/cloud"
import { z } from "zod"
import type { Rest } from "@/utils/git-adapter/helpers/rest"
import { GitAdapterError } from "@/utils/git-adapter/types"
import {
  groupThreads,
  handleOf,
  issueStateFilter,
  pageOf,
  pageOfSlice,
  pagingQuery,
  toChangedFile,
  toComment,
  toCommitSummary,
  toIssue,
  toOwner,
  toPullRequest,
  toRepository,
  toThread,
  toThreadComment,
  toUser,
} from "./bitbucket-mappers"
import {
  pageSchema,
  rawAccountSchema,
  rawActivityCommentSchema,
  rawActivityCommitSchema,
  rawCommentSchema,
  rawCommitSchema,
  rawDiffstatSchema,
  rawIssueSchema,
  rawPullRequestSchema,
  rawRepositorySchema,
  type RawAccount,
  type RawActivity,
  type RawComment,
  type RawIssue,
  type RawPullRequest,
  type RawRepository,
  type RawThread,
  type RawWorkspace,
} from "./bitbucket-raw"
import { parseResponse } from "./provider-client"

export const BITBUCKET_API_ROOT = "https://api.bitbucket.org/2.0"
const DEFAULT_PAGE_SIZE = 30
const MAX_PAGE_SIZE = 100
const OPEN_STATES = ["OPEN"]
const CLOSED_STATES = ["MERGED", "DECLINED", "SUPERSEDED"]
const ALL_STATES = [...OPEN_STATES, ...CLOSED_STATES]
const JSON_HEADERS = { "content-type": "application/json" }
const PLATFORM = "Bitbucket"

const QUERY_SPECIAL_CHARACTERS = /["\\]/g

function escapeQueryText(text: string): string {
  return text.replace(QUERY_SPECIAL_CHARACTERS, "\\$&")
}

function statesFor(state: ListOptions["state"]): string[] {
  if (state === "closed") return CLOSED_STATES
  if (state === "all") return [...OPEN_STATES, ...CLOSED_STATES]
  return OPEN_STATES
}

function textOf(result: { data?: string }): string {
  if (result.data === undefined) {
    throw new GitAdapterError("Bitbucket answered with nothing.")
  }
  return result.data
}

function unsupportedError(action: string): GitAdapterError {
  return new GitAdapterError(`The Bitbucket provider cannot ${action}.`, "unsupported")
}

function commentIdOf(id: string): number {
  const commentId = Number(id)
  if (!Number.isInteger(commentId)) {
    throw new GitAdapterError(`"${id}" is not a Bitbucket comment id.`)
  }
  return commentId
}

interface BitbucketRawTypes extends ProviderRawTypes {
  owner: RawWorkspace
  repository: RawRepository
  issue: RawIssue
  pullRequest: RawPullRequest
  user: RawAccount
  thread: RawThread
  comment: RawComment
}

export interface BitbucketForgeAdapterOptions { rest: Rest }

export class BitbucketForgeAdapter extends Provider<BitbucketRawTypes> {
  private readonly rest: Rest
  private readonly client: ReturnType<typeof createBitbucketCloudClient>

  constructor({ rest }: BitbucketForgeAdapterOptions) {
    super()
    this.rest = rest
    this.client = createBitbucketCloudClient({
      baseUrl: BITBUCKET_API_ROOT,
      fetch: async (request) =>
        rest.request(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
        }),
    })
  }

  async readPullRequest(owner: string, repo: string, id: number): Promise<RawPullRequest> {
    const result = await this.client.GET(
      "/repositories/{workspace}/{repo_slug}/pullrequests/{pull_request_id}",
      { params: { path: { workspace: owner, repo_slug: repo, pull_request_id: id } } },
    )
    return parseResponse(rawPullRequestSchema, result.data, PLATFORM)
  }

  async readViewer(): Promise<RawAccount> {
    return parseResponse(rawAccountSchema, await this.rest.json("user"), PLATFORM)
  }

  async listPullRequestsByAuthor(owner: string, repo: string, author: string, limit: number): Promise<RawPullRequest[]> {
    const query = new URLSearchParams([
      ...ALL_STATES.map((state): [string, string] => ["state", state]),
      ["q", `author.nickname = "${escapeQueryText(author)}"`],
      ["sort", "-updated_on"],
      ["pagelen", String(limit)],
    ])
    const page = parseResponse(
      pageSchema(rawPullRequestSchema),
      await this.rest.json(`${this.repoPath(owner, repo)}/pullrequests?${query.toString()}`),
      PLATFORM,
    )
    return page.values ?? []
  }

  async listRecentPullRequestAuthors(owner: string, repo: string, limit: number): Promise<RawAccount[]> {
    const query = new URLSearchParams([
      ...ALL_STATES.map((state): [string, string] => ["state", state]),
      ["sort", "-updated_on"],
      ["pagelen", String(limit)],
      ["fields", "values.author"],
    ])
    const page = parseResponse(
      pageSchema(z.object({ author: rawAccountSchema.optional() })),
      await this.rest.json(`${this.repoPath(owner, repo)}/pullrequests?${query.toString()}`),
      PLATFORM,
    )
    return (page.values ?? []).flatMap((pullRequest) => pullRequest.author ?? [])
  }

  async listWorkspaceMembers(workspace: string, limit: number): Promise<RawAccount[]> {
    const page = parseResponse(
      pageSchema(z.object({ user: rawAccountSchema.optional() })),
      await this.rest.json(`workspaces/${encodeURIComponent(workspace)}/members?pagelen=${String(limit)}`),
      PLATFORM,
    )
    return (page.values ?? []).flatMap((member) => member.user ?? [])
  }

  async readPullRequestActivity(owner: string, repo: string, id: number, limit: number): Promise<RawActivity> {
    const route = `${this.repoPath(owner, repo)}/pullrequests/${String(id)}`
    const [comments, commits] = await Promise.all([
      this.rest.json(`${route}/comments?pagelen=${String(limit)}&sort=-created_on`),
      this.rest.json(`${route}/commits?pagelen=${String(limit)}`),
    ])
    return {
      comments: (parseResponse(pageSchema(rawActivityCommentSchema), comments, PLATFORM).values ?? []).map((comment) => ({
        login: handleOf(comment.user),
        at: comment.created_on,
      })),
      commitDates: (parseResponse(pageSchema(rawActivityCommitSchema), commits, PLATFORM).values ?? []).flatMap((commit) => commit.date ?? []),
    }
  }

  async readPullRequestDiff(owner: string, repo: string, id: number): Promise<string> {
    return textOf(
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
    return textOf(
      await this.client.GET("/repositories/{workspace}/{repo_slug}/diff/{spec}", {
        params: {
          path: { workspace: owner, repo_slug: repo, spec: `${base}..${head}` },
          query: { topic: true },
        },
        parseAs: "text",
      }),
    )
  }

  protected mapOwner(raw: RawWorkspace): Owner {
    return toOwner(raw)
  }

  protected mapRepository(raw: RawRepository): Repository {
    return toRepository(raw)
  }

  protected mapIssue(raw: RawIssue): Issue {
    return toIssue(raw)
  }

  protected mapPullRequest(raw: RawPullRequest): PullRequest {
    return toPullRequest(raw)
  }

  protected mapUser(raw: RawAccount): User {
    return toUser(raw)
  }

  protected mapThread(raw: RawThread): Thread {
    return toThread(raw)
  }

  protected mapComment(raw: RawComment): Comment {
    return toComment(raw)
  }

  protected async listRepos(owner: string, options?: ListOptions): Promise<PageResult<Repository>> {
    return await this.readPage(
      `repositories/${encodeURIComponent(owner)}`,
      rawRepositorySchema,
      options,
      [["sort", "-updated_on"]],
      (raw) => this.mapRepository(raw),
    )
  }

  protected async getRepo(owner: string, repo: string): Promise<Repository> {
    return this.mapRepository(
      parseResponse(rawRepositorySchema, await this.rest.json(this.repoPath(owner, repo)), PLATFORM),
    )
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
    return await this.readPage(
      `${this.repoPath(owner, repo)}/pullrequests`,
      rawPullRequestSchema,
      options,
      [...statesFor(options?.state).map((state): [string, string] => ["state", state]), ["sort", "-updated_on"]],
      (raw) => this.mapPullRequest(raw),
    )
  }

  protected async createPullRequest(
    owner: string,
    repo: string,
    input: CreatePullRequestInput,
  ): Promise<PullRequest> {
    if ((input.assignees ?? []).length > 0) throw unsupportedError("assign a pull request")
    const created = await this.postJson(`${this.repoPath(owner, repo)}/pullrequests`, {
      title: input.title,
      description: input.body,
      source: { branch: { name: input.sourceBranch } },
      destination: { branch: { name: input.targetBranch } },
      ...(input.draft === undefined ? {} : { draft: input.draft }),
    })
    return this.mapPullRequest(parseResponse(rawPullRequestSchema, created, PLATFORM))
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
    const end
      = options?.maxChars === undefined
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

  protected async getCommit(owner: string, repo: string, sha: string): Promise<Commit> {
    const route = this.repoPath(owner, repo)
    const [commit, diffstats] = await Promise.all([
      this.rest.json(`${route}/commit/${encodeURIComponent(sha)}`),
      this.readAllPages(`${route}/diffstat/${encodeURIComponent(sha)}?pagelen=${String(MAX_PAGE_SIZE)}`, rawDiffstatSchema),
    ])
    return {
      ...toCommitSummary(parseResponse(rawCommitSchema, commit, PLATFORM)),
      files: diffstats.map(toChangedFile),
      filesComplete: true,
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
    const raw = parseResponse(
      pageSchema(rawCommitSchema),
      await this.rest.json(
        `${this.repoPath(owner, repo)}/commits?include=${encodeURIComponent(head)}`
        + `&exclude=${encodeURIComponent(base)}`
        + `&pagelen=${String(options?.perPage ?? DEFAULT_PAGE_SIZE)}&page=${String(page)}`,
      ),
      PLATFORM,
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

  protected async listIssues(
    owner: string,
    repo: string,
    options?: ListOptions,
  ): Promise<PageResult<Issue>> {
    const stateFilter = issueStateFilter(options?.state)
    return await this.readPage(
      `${this.repoPath(owner, repo)}/issues`,
      rawIssueSchema,
      options,
      [["sort", "-updated_on"], ...(stateFilter === null ? [] : [["q", stateFilter] as [string, string]])],
      (raw) => this.mapIssue(raw),
    )
  }

  protected async getIssue(owner: string, repo: string, number: number): Promise<Issue> {
    return this.mapIssue(
      parseResponse(
        rawIssueSchema,
        await this.rest.json(`${this.repoPath(owner, repo)}/issues/${String(number)}`),
        PLATFORM,
      ),
    )
  }

  protected async createIssue(owner: string, repo: string, input: CreateIssueInput): Promise<Issue> {
    if ((input.labels ?? []).length > 0) throw unsupportedError("label an issue")
    if ((input.assignees ?? []).length > 0) throw unsupportedError("assign an issue by login")
    const created = await this.postJson(`${this.repoPath(owner, repo)}/issues`, {
      title: input.title,
      content: { raw: input.body },
    })
    return this.mapIssue(parseResponse(rawIssueSchema, created, PLATFORM))
  }

  protected async listIssueComments(
    owner: string,
    repo: string,
    number: number,
    options?: ListCommentOptions,
  ): Promise<PageResult<Comment>> {
    return await this.readCommentPage(`${this.repoPath(owner, repo)}/issues/${String(number)}/comments`, options)
  }

  protected async listPullRequestComments(
    owner: string,
    repo: string,
    number: number,
    options?: ListCommentOptions,
  ): Promise<PageResult<Comment>> {
    return await this.readCommentPage(this.commentsPath(owner, repo, number), options)
  }

  protected async getIssueComment(
    owner: string,
    repo: string,
    number: number,
    commentId: string,
  ): Promise<Comment> {
    return this.mapComment(
      await this.readComment(`${this.repoPath(owner, repo)}/issues/${String(number)}/comments/${String(commentIdOf(commentId))}`),
    )
  }

  protected async getPullRequestComment(
    owner: string,
    repo: string,
    number: number,
    commentId: string,
  ): Promise<Comment> {
    return this.mapComment(
      await this.readComment(`${this.commentsPath(owner, repo, number)}/${String(commentIdOf(commentId))}`),
    )
  }

  protected async createPullRequestComment(
    owner: string,
    repo: string,
    number: number,
    input: CreateCommentInput,
  ): Promise<Comment> {
    const created = await this.postJson(this.commentsPath(owner, repo, number), { content: { raw: input.body } })
    return this.mapComment(parseResponse(rawCommentSchema, created, PLATFORM))
  }

  protected async createIssueComment(
    owner: string,
    repo: string,
    number: number,
    input: CreateCommentInput,
  ): Promise<Comment> {
    const created = await this.postJson(
      `${this.repoPath(owner, repo)}/issues/${String(number)}/comments`,
      { content: { raw: input.body } },
    )
    return this.mapComment(parseResponse(rawCommentSchema, created, PLATFORM))
  }

  protected async getUser(username: string): Promise<User> {
    return this.mapUser(
      parseResponse(rawAccountSchema, await this.rest.json(`users/${encodeURIComponent(username)}`), PLATFORM),
    )
  }

  protected async getAuthenticatedUser(): Promise<User> {
    return this.mapUser(await this.readViewer())
  }

  protected async listThreads(
    owner: string,
    repo: string,
    number: number,
    options?: ListThreadOptions,
  ): Promise<PageResult<Thread>> {
    const threads = (await this.readThreads(owner, repo, number)).map((raw) => this.mapThread(raw))
    return pageOfSlice(
      this.filterThreadsByState(threads, options?.state),
      options?.page ?? 1,
      options?.perPage ?? DEFAULT_PAGE_SIZE,
    )
  }

  protected async getThread(
    owner: string,
    repo: string,
    number: number,
    threadId: string,
  ): Promise<Thread> {
    const threadRoot = commentIdOf(threadId)
    const found = (await this.readThreads(owner, repo, number)).find((raw) => raw.root.id === threadRoot)
    if (found === undefined) {
      throw new GitAdapterError(`Pull request #${String(number)} has no thread ${threadId}.`, "no-repo")
    }
    return this.mapThread(found)
  }

  protected async replyToThread(
    owner: string,
    repo: string,
    number: number,
    threadId: string,
    input: ReplyThreadInput,
  ): Promise<ThreadComment> {
    const created = await this.postJson(this.commentsPath(owner, repo, number), {
      content: { raw: input.body },
      parent: { id: commentIdOf(threadId) },
    })
    return toThreadComment(parseResponse(rawCommentSchema, created, PLATFORM))
  }

  protected async resolveThread(
    owner: string,
    repo: string,
    number: number,
    threadId: string,
  ): Promise<Thread> {
    await this.rest.request(this.resolutionPath(owner, repo, number, threadId), { method: "POST" })
    return await this.getThread(owner, repo, number, threadId)
  }

  protected async unresolveThread(
    owner: string,
    repo: string,
    number: number,
    threadId: string,
  ): Promise<Thread> {
    await this.rest.request(this.resolutionPath(owner, repo, number, threadId), { method: "DELETE" })
    return await this.getThread(owner, repo, number, threadId)
  }

  private async readPage<Schema extends z.ZodType, Mapped>(
    path: string,
    schema: Schema,
    options: { page?: number, perPage?: number } | undefined,
    extraQuery: readonly (readonly [string, string])[],
    map: (raw: z.output<Schema>) => Mapped,
  ): Promise<PageResult<Mapped>> {
    const page = options?.page ?? 1
    const query = pagingQuery(page, options?.perPage ?? DEFAULT_PAGE_SIZE, extraQuery)
    const raw = parseResponse(pageSchema(schema), await this.rest.json(`${path}?${query.toString()}`), PLATFORM)
    return pageOf(raw, (raw.values ?? []).map(map), page)
  }

  private async readCommentPage(path: string, options: ListCommentOptions | undefined): Promise<PageResult<Comment>> {
    const page = await this.readPage(path, rawCommentSchema, options, [["sort", "created_on"]], (raw) => raw)
    return { ...page, items: page.items.filter((raw) => raw.deleted !== true).map((raw) => this.mapComment(raw)) }
  }

  private async readComment(path: string): Promise<RawComment> {
    return parseResponse(rawCommentSchema, await this.rest.json(path), PLATFORM)
  }

  private async readThreads(owner: string, repo: string, number: number): Promise<RawThread[]> {
    const comments = await this.readAllPages(
      `${this.commentsPath(owner, repo, number)}?pagelen=${String(MAX_PAGE_SIZE)}&sort=created_on`,
      rawCommentSchema,
    )
    return groupThreads(comments)
  }

  private async readAllPages<Schema extends z.ZodType>(
    path: string,
    schema: Schema,
  ): Promise<z.output<Schema>[]> {
    const page = parseResponse(pageSchema(schema), await this.rest.json(path), PLATFORM)
    const items = page.values ?? []
    return page.next === undefined ? items : [...items, ...(await this.readAllPages(page.next, schema))]
  }

  private async postJson(path: string, body: unknown): Promise<unknown> {
    return await this.rest.json(path, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) })
  }

  private commentsPath(owner: string, repo: string, number: number): string {
    return `${this.repoPath(owner, repo)}/pullrequests/${String(number)}/comments`
  }

  private resolutionPath(owner: string, repo: string, number: number, threadId: string): string {
    return `${this.commentsPath(owner, repo, number)}/${String(commentIdOf(threadId))}/resolve`
  }

  private repoPath(owner: string, repo: string): string {
    return `repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  }
}
