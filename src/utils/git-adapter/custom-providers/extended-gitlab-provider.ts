import { GitLabProvider } from "@agntn/forges/gitlab"
import { guarded, type ProviderClient } from "./provider-client"

export type GitlabUser = {
  username?: string
  name?: string
  avatar_url?: string | null
}

export type GitlabMergeRequest = {
  iid: number
  title: string
  author?: GitlabUser
  reviewers?: GitlabUser[]
  web_url: string
  updated_at: string
  draft?: boolean
  work_in_progress?: boolean
  state?: string
  sha?: string
  target_branch?: string
  diff_refs?: { base_sha?: string }
}

export type GitlabApprovals = { approved_by?: { user?: GitlabUser }[] }

export type GitlabReviewers = {
  mergeRequest: GitlabMergeRequest
  approvals: GitlabApprovals
}

export type GitlabComparison = {
  commits?: unknown[]
  diffs?: {
    old_path?: string
    new_path?: string
    diff?: string
    new_file?: boolean
    renamed_file?: boolean
    deleted_file?: boolean
  }[]
}

export class ExtendedGitLabProvider extends GitLabProvider {
  readMergeRequest(owner: string, repo: string, iid: number): Promise<GitlabMergeRequest> {
    return guarded(
      "gitlab",
      async () =>
        (await this.http()(
          `${this.projectRoute(owner, repo)}/merge_requests/${String(iid)}`,
        )) as GitlabMergeRequest,
    )
  }

  listMergeRequests(
    owner: string,
    repo: string,
    query: Record<string, string | number>,
  ): Promise<GitlabMergeRequest[]> {
    return guarded(
      "gitlab",
      async () =>
        (await this.http()(`${this.projectRoute(owner, repo)}/merge_requests`, {
          query,
        })) as GitlabMergeRequest[],
    )
  }

  listLabelNames(owner: string, repo: string, limit: number): Promise<string[]> {
    return guarded("gitlab", async () => {
      const labels = (await this.http()(`${this.projectRoute(owner, repo)}/labels`, {
        query: { per_page: limit },
      })) as { name?: string }[]
      return labels.map((label) => label.name ?? "")
    })
  }

  readReviewers(owner: string, repo: string, iid: number): Promise<GitlabReviewers> {
    return guarded("gitlab", async () => {
      const route = `${this.projectRoute(owner, repo)}/merge_requests/${String(iid)}`
      const [mergeRequest, approvals] = await Promise.all([
        this.readMergeRequest(owner, repo, iid),
        (this.http()(`${route}/approvals`) as Promise<GitlabApprovals>).catch(
          (): GitlabApprovals => ({ approved_by: [] }),
        ),
      ])
      return { mergeRequest, approvals }
    })
  }

  readMergeRequestDiff(owner: string, repo: string, iid: number): Promise<string> {
    return guarded("gitlab", async () => {
      const diff = await this.http()(
        `${this.projectRoute(owner, repo)}/merge_requests/${String(iid)}/raw_diffs`,
        { responseType: "text" },
      )
      return typeof diff === "string" ? diff : String(diff)
    })
  }

  compareWithDiffs(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<GitlabComparison> {
    return guarded(
      "gitlab",
      async () =>
        (await this.http()(`${this.projectRoute(owner, repo)}/repository/compare`, {
          query: { from: base, to: head },
        })) as GitlabComparison,
    )
  }

  private http(): ProviderClient {
    return this["client"] as ProviderClient
  }

  private projectRoute(owner: string, repo: string): string {
    return `/projects/${encodeURIComponent(`${owner}/${repo}`)}`
  }
}
