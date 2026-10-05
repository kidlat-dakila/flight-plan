import { parseLinkHeader } from "@agntn/forges"
import { GitHubProvider } from "@agntn/forges/github"
import { z } from "zod"
import { GitAdapterError } from "@/utils/git-adapter/types"
import { guarded, parseResponse, toProviderClient, type ProviderClient } from "./provider-client"

const PAGE_SIZE = 100
const MAX_PAGES = 20
const DIFF_MEDIA_TYPE = "application/vnd.github.v3.diff"
const PLATFORM = "GitHub"
const GRAPHQL_PATH = "graphql"
const LOGIN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/
const SLUG_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/
const AUTHOR_HANDLE_PREFIX = "@"

const githubUserSchema = z.object({
  login: z.string().optional(),
  name: z.string().optional(),
  avatar_url: z.string().optional(),
})

const githubPullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  user: githubUserSchema.optional(),
  html_url: z.string(),
  updated_at: z.string(),
  draft: z.boolean().optional(),
  state: z.string().optional(),
  base: z.object({ ref: z.string().optional(), sha: z.string().optional() }).optional(),
})

const pullRequestAuthorSchema = z.object({ user: githubUserSchema.optional() })

const githubReviewSchema = z.object({ user: githubUserSchema.optional(), state: z.string().optional() })

const githubComparisonSchema = z.object({
  total_commits: z.number().optional(),
  files: z
    .array(
      z.object({
        filename: z.string().optional(),
        status: z.string().optional(),
        previous_filename: z.string().optional(),
        patch: z.string().optional(),
      }),
    )
    .optional(),
})

const labelsSchema = z.array(z.object({ name: z.string().optional() }))

const requestedReviewersSchema = z.object({ users: z.array(githubUserSchema).optional() })

const loginNodeSchema = z.object({ login: z.string() }).nullable()

const requestedReviewerNodeSchema = z.object({ login: z.string().optional() }).nullable()

function nodesOf<Node extends z.ZodType>(node: Node): z.ZodObject<{ nodes: z.ZodArray<z.ZodNullable<Node>> }> {
  return z.object({ nodes: z.array(node.nullable()) })
}

const dated = z.object({ author: loginNodeSchema, createdAt: z.string() })

const historyPullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  state: z.enum(["OPEN", "CLOSED", "MERGED"]),
  isDraft: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  headRefName: z.string(),
  author: z.object({ login: z.string(), avatarUrl: z.string() }).nullable(),
  reviewRequests: nodesOf(z.object({ requestedReviewer: requestedReviewerNodeSchema })),
  reviews: nodesOf(z.object({ author: loginNodeSchema, submittedAt: z.string().nullable() })),
  comments: nodesOf(dated),
  reviewThreads: nodesOf(z.object({ comments: nodesOf(dated) })),
  commits: nodesOf(z.object({ commit: z.object({ committedDate: z.string() }) })),
})

const historyResponseSchema = z.object({
  data: z.record(z.string(), z.object({ nodes: z.array(historyPullRequestSchema.nullable()) })).nullable().optional(),
  errors: z.array(z.object({ type: z.string().optional() })).optional(),
})

const personNodeSchema = z.object({
  login: z.string(),
  name: z.string().nullable().optional(),
  avatarUrl: z.string(),
})

const peopleResponseSchema = z.object({
  data: z
    .object({
      repository: z
        .object({
          assignableUsers: nodesOf(personNodeSchema).nullable().optional(),
          pullRequests: nodesOf(z.object({ author: personNodeSchema.nullable() })),
        })
        .nullable(),
    })
    .nullable()
    .optional(),
  errors: z.array(z.object({ type: z.string().optional() })).optional(),
})

export type GithubUser = z.infer<typeof githubUserSchema>

export type GithubPersonNode = z.infer<typeof personNodeSchema>

export interface GithubPeople {
  members: GithubPersonNode[]
  authors: GithubPersonNode[]
}

export type GithubPullRequest = z.infer<typeof githubPullRequestSchema>

export type GithubReview = z.infer<typeof githubReviewSchema>

export type GithubComparison = z.infer<typeof githubComparisonSchema>

export type GithubHistoryPullRequest = z.infer<typeof historyPullRequestSchema>

export type GithubPullRequestAuthor = z.infer<typeof pullRequestAuthorSchema>

export interface GithubReviewers {
  pullRequest: GithubPullRequestAuthor
  reviews: GithubReview[]
  requested: GithubUser[]
}

const HISTORY_FIELDS = `fragment HistoryFields on PullRequest {
  number title state isDraft createdAt updatedAt headRefName
  author { login avatarUrl }
  reviewRequests(first: 20) { nodes { requestedReviewer { ... on User { login } } } }
  reviews(last: 30) { nodes { author { login } submittedAt } }
  comments(last: 30) { nodes { author { login } createdAt } }
  reviewThreads(last: 30) { nodes { comments(last: 10) { nodes { author { login } createdAt } } } }
  commits(last: 20) { nodes { commit { committedDate } } }
}`

const MEMBER_LIMIT = 20
const RECENT_AUTHOR_LIMIT = 100

function isSlug(owner: string, repo: string): boolean {
  return SLUG_SEGMENT_PATTERN.test(owner) && SLUG_SEGMENT_PATTERN.test(repo)
}

function uniqueLogins(logins: readonly string[]): string[] {
  return logins
    .map((login) => login.replace(AUTHOR_HANDLE_PREFIX, ""))
    .filter((login) => LOGIN_PATTERN.test(login))
    .filter((login, position, all) => all.findIndex((other) => other.toLowerCase() === login.toLowerCase()) === position)
}

export function buildHistoryQuery(owner: string, repo: string, authors: readonly string[], limit: number): string | null {
  const logins = uniqueLogins(authors)
  if (!isSlug(owner, repo) || logins.length === 0) return null
  const searches = logins.map(
    (login, position) =>
      `a${String(position)}: search(query: "repo:${owner}/${repo} is:pr author:${login} sort:updated-desc", type: ISSUE, first: ${String(limit)}) { nodes { ...HistoryFields } }`,
  )
  return `query {\n${searches.join("\n")}\n}\n${HISTORY_FIELDS}`
}

export function buildPeopleQuery(owner: string, repo: string, query: string): string | null {
  if (!isSlug(owner, repo)) return null
  const typedText = query.trim()
  const memberFilter = typedText === "" ? "" : `, query: ${JSON.stringify(typedText)}`
  return `query {
  repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}) {
    assignableUsers(first: ${String(MEMBER_LIMIT)}${memberFilter}) { nodes { login avatarUrl name } }
    pullRequests(first: ${String(RECENT_AUTHOR_LIMIT)}, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { author { login avatarUrl ... on User { name } } }
    }
  }
}`
}

export class ExtendedGitHubProvider extends GitHubProvider {
  async readViewer(): Promise<GithubUser> {
    return guarded("github", async () => parseResponse(githubUserSchema, await this.http()("/user"), PLATFORM))
  }

  async searchPeople(owner: string, repo: string, query: string): Promise<GithubPeople> {
    const graphqlQuery = buildPeopleQuery(owner, repo, query)
    if (graphqlQuery === null) return { members: [], authors: [] }
    return guarded("github", async () => {
      const response = parseResponse(
        peopleResponseSchema,
        await this.http()(GRAPHQL_PATH, { method: "POST", body: { query: graphqlQuery } }),
        PLATFORM,
      )
      const repository = response.data?.repository
      if (repository === null || repository === undefined) {
        throw new GitAdapterError(
          `GitHub could not search ${owner}/${repo}.`,
          response.errors?.[0]?.type === "NOT_FOUND" ? "no-repo" : "auth",
        )
      }
      return {
        members: (repository.assignableUsers?.nodes ?? []).filter((node) => node !== null),
        authors: repository.pullRequests.nodes.flatMap((node) => node?.author ?? []),
      }
    })
  }

  async listPullRequestHistories(
    owner: string,
    repo: string,
    authors: readonly string[],
    limit: number,
  ): Promise<GithubHistoryPullRequest[]> {
    const query = buildHistoryQuery(owner, repo, authors, limit)
    if (query === null) return []
    return guarded("github", async () => {
      const response = parseResponse(
        historyResponseSchema,
        await this.http()(GRAPHQL_PATH, { method: "POST", body: { query } }),
        PLATFORM,
      )
      if (response.data === null || response.data === undefined) {
        throw new GitAdapterError(
          `GitHub could not search ${owner}/${repo}.`,
          response.errors?.[0]?.type === "NOT_FOUND" ? "no-repo" : "auth",
        )
      }
      return Object.values(response.data).flatMap((search) => search.nodes.filter((node) => node !== null))
    })
  }

  async readPullRequest(owner: string, repo: string, number: number): Promise<GithubPullRequest> {
    return guarded("github", async () =>
      parseResponse(
        githubPullRequestSchema,
        await this.http()(`${this.route(owner, repo)}/pulls/${String(number)}`),
        PLATFORM,
      ),
    )
  }

  async listOpenPullRequests(owner: string, repo: string, limit: number): Promise<GithubPullRequest[]> {
    return guarded("github", async () =>
      parseResponse(
        z.array(githubPullRequestSchema),
        await this.http()(`${this.route(owner, repo)}/pulls`, {
          query: {
            state: "open",
            sort: "updated",
            direction: "desc",
            per_page: Math.min(limit, PAGE_SIZE),
          },
        }),
        PLATFORM,
      ),
    )
  }

  async listLabelNames(owner: string, repo: string): Promise<string[]> {
    return guarded("github", async () => {
      const labels = parseResponse(
        labelsSchema,
        await this.http()(`${this.route(owner, repo)}/labels`, { query: { per_page: PAGE_SIZE } }),
        PLATFORM,
      )
      return labels.map((label) => label.name ?? "")
    })
  }

  async readReviewers(owner: string, repo: string, number: number): Promise<GithubReviewers> {
    return guarded("github", async () => {
      const pullRoute = `${this.route(owner, repo)}/pulls/${String(number)}`
      const [pullRequest, reviews, requested] = await Promise.all([
        this.http()(pullRoute).then((response) => parseResponse(pullRequestAuthorSchema, response, PLATFORM)),
        this.readAllPages(`${pullRoute}/reviews`, githubReviewSchema),
        this.http()(`${pullRoute}/requested_reviewers`),
      ])
      return { pullRequest, reviews, requested: parseResponse(requestedReviewersSchema, requested, PLATFORM).users ?? [] }
    })
  }

  async readPullRequestDiff(owner: string, repo: string, number: number): Promise<string> {
    return guarded("github", async () => {
      const diff = await this.http()(
        `${this.route(owner, repo)}/pulls/${String(number)}`,
        { headers: { accept: DIFF_MEDIA_TYPE }, responseType: "text" },
      )
      return typeof diff === "string" ? diff : JSON.stringify(diff)
    })
  }

  async compareWithPatches(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<GithubComparison> {
    return guarded("github", async () =>
      parseResponse(
        githubComparisonSchema,
        await this.http()(`${this.route(owner, repo)}/compare/${base}...${head}`),
        PLATFORM,
      ),
    )
  }

  private http(): ProviderClient {
    return toProviderClient(Reflect.get(this, "client"))
  }

  private route(owner: string, repo: string): string {
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  }

  private async readAllPages<Schema extends z.ZodType>(path: string, schema: Schema): Promise<z.output<Schema>[]> {
    const items = await this.collectPages(path, 0, [])
    return items.map((item) => parseResponse(schema, item, PLATFORM))
  }

  private async collectPages(path: string | undefined, page: number, collected: readonly unknown[]): Promise<unknown[]> {
    if (path === undefined || page >= MAX_PAGES) return [...collected]
    const response = await this.http().raw(path, page === 0 ? { query: { per_page: PAGE_SIZE } } : undefined)
    const items = z.array(z.unknown()).safeParse(response._data)
    return await this.collectPages(
      parseLinkHeader(response.headers.get("link")).next,
      page + 1,
      [...collected, ...(items.success ? items.data : [])],
    )
  }
}
