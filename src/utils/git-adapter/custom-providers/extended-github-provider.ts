import { parseLinkHeader } from "@agntn/forges"
import { GitHubProvider } from "@agntn/forges/github"
import { guarded, type ProviderClient } from "./provider-client"

const PAGE_SIZE = 100
const MAX_PAGES = 20
const DIFF_MEDIA_TYPE = "application/vnd.github.v3.diff"

export type GithubUser = { login?: string; name?: string; avatar_url?: string }

export type GithubPullRequest = {
  number: number
  title: string
  user?: GithubUser
  html_url: string
  updated_at: string
  draft?: boolean
  state?: string
  base?: { ref?: string; sha?: string }
}

export type GithubReview = { user?: GithubUser; state?: string }

export type GithubReviewers = {
  pullRequest: GithubPullRequest
  reviews: GithubReview[]
  requested: GithubUser[]
}

export type GithubComparison = {
  total_commits?: number
  files?: {
    filename?: string
    status?: string
    previous_filename?: string
    patch?: string
  }[]
}

export class ExtendedGitHubProvider extends GitHubProvider {
  readPullRequest(owner: string, repo: string, number: number): Promise<GithubPullRequest> {
    return guarded(
      "github",
      async () =>
        (await this.http()(
          `${this.route(owner, repo)}/pulls/${String(number)}`,
        )) as GithubPullRequest,
    )
  }

  listOpenPullRequests(owner: string, repo: string, limit: number): Promise<GithubPullRequest[]> {
    return guarded(
      "github",
      async () =>
        (await this.http()(`${this.route(owner, repo)}/pulls`, {
          query: {
            state: "open",
            sort: "updated",
            direction: "desc",
            per_page: Math.min(limit, PAGE_SIZE),
          },
        })) as GithubPullRequest[],
    )
  }

  listLabelNames(owner: string, repo: string): Promise<string[]> {
    return guarded("github", async () => {
      const labels = (await this.http()(`${this.route(owner, repo)}/labels`, {
        query: { per_page: PAGE_SIZE },
      })) as { name?: string }[]
      return labels.map((label) => label.name ?? "")
    })
  }

  readReviewers(owner: string, repo: string, number: number): Promise<GithubReviewers> {
    return guarded("github", async () => {
      const pullRoute = `${this.route(owner, repo)}/pulls/${String(number)}`
      const [pullRequest, reviews, requested] = await Promise.all([
        this.readPullRequest(owner, repo, number),
        this.readAllPages<GithubReview>(`${pullRoute}/reviews`),
        this.http()(`${pullRoute}/requested_reviewers`) as Promise<{ users?: GithubUser[] }>,
      ])
      return { pullRequest, reviews, requested: requested.users ?? [] }
    })
  }

  readPullRequestDiff(owner: string, repo: string, number: number): Promise<string> {
    return guarded("github", async () => {
      const diff = await this.http()(
        `${this.route(owner, repo)}/pulls/${String(number)}`,
        { headers: { accept: DIFF_MEDIA_TYPE }, responseType: "text" },
      )
      return typeof diff === "string" ? diff : String(diff)
    })
  }

  compareWithPatches(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<GithubComparison> {
    return guarded(
      "github",
      async () =>
        (await this.http()(
          `${this.route(owner, repo)}/compare/${base}...${head}`,
        )) as GithubComparison,
    )
  }

  private http(): ProviderClient {
    return this["client"] as ProviderClient
  }

  private route(owner: string, repo: string): string {
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  }

  private async readAllPages<T>(path: string): Promise<T[]> {
    const all: T[] = []
    let next: string | undefined = path
    for (let page = 0; next !== undefined && page < MAX_PAGES; page += 1) {
      const response: { _data: unknown; headers: Headers } = await this.http().raw(
        next,
        page === 0 ? { query: { per_page: PAGE_SIZE } } : undefined,
      )
      if (Array.isArray(response._data)) all.push(...(response._data as T[]))
      next = parseLinkHeader(response.headers.get("link")).next
    }
    return all
  }
}
