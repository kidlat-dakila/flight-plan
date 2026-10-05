import { GitLabProvider } from "@agntn/forges/gitlab"
import { z } from "zod"
import { guarded, parseResponse, toProviderClient, type ProviderClient } from "./provider-client"

const PLATFORM = "GitLab"

const gitlabUserSchema = z.object({
  username: z.string().optional(),
  name: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
})

const gitlabMergeRequestSchema = z.object({
  iid: z.number(),
  title: z.string(),
  author: gitlabUserSchema.optional(),
  reviewers: z.array(gitlabUserSchema).optional(),
  web_url: z.string(),
  updated_at: z.string(),
  created_at: z.string().optional(),
  draft: z.boolean().optional(),
  work_in_progress: z.boolean().optional(),
  state: z.string().optional(),
  sha: z.string().optional(),
  source_branch: z.string().optional(),
  target_branch: z.string().optional(),
  diff_refs: z.object({ base_sha: z.string().optional() }).optional(),
})

const gitlabApprovalsSchema = z.object({ approved_by: z.array(z.object({ user: gitlabUserSchema.optional() })).optional() })

const gitlabComparisonSchema = z.object({
  commits: z.array(z.unknown()).optional(),
  diffs: z
    .array(
      z.object({
        old_path: z.string().optional(),
        new_path: z.string().optional(),
        diff: z.string().optional(),
        new_file: z.boolean().optional(),
        renamed_file: z.boolean().optional(),
        deleted_file: z.boolean().optional(),
      }),
    )
    .optional(),
})

const labelsSchema = z.array(z.object({ name: z.string().optional() }))

const notesSchema = z.array(
  z.object({
    author: gitlabUserSchema,
    created_at: z.string(),
    system: z.boolean(),
    body: z.string(),
  }),
)

const commitsSchema = z.array(z.object({ committed_date: z.string() }))

export type GitlabUser = z.infer<typeof gitlabUserSchema>

export type GitlabMergeRequest = z.infer<typeof gitlabMergeRequestSchema>

export type GitlabApprovals = z.infer<typeof gitlabApprovalsSchema>

export type GitlabComparison = z.infer<typeof gitlabComparisonSchema>

export type GitlabNote = z.infer<typeof notesSchema>[number]

export interface GitlabReviewers {
  mergeRequest: GitlabMergeRequest
  approvals: GitlabApprovals
}

export interface GitlabActivity {
  notes: GitlabNote[]
  commitDates: string[]
}

export class ExtendedGitLabProvider extends GitLabProvider {
  async readViewer(): Promise<GitlabUser> {
    return guarded("gitlab", async () => parseResponse(gitlabUserSchema, await this.http()("/user"), PLATFORM))
  }

  async readMergeRequest(owner: string, repo: string, iid: number): Promise<GitlabMergeRequest> {
    return guarded("gitlab", async () =>
      parseResponse(
        gitlabMergeRequestSchema,
        await this.http()(`${this.projectRoute(owner, repo)}/merge_requests/${String(iid)}`),
        PLATFORM,
      ),
    )
  }

  async listMergeRequests(
    owner: string,
    repo: string,
    query: Record<string, string | number>,
  ): Promise<GitlabMergeRequest[]> {
    return guarded("gitlab", async () =>
      parseResponse(
        z.array(gitlabMergeRequestSchema),
        await this.http()(`${this.projectRoute(owner, repo)}/merge_requests`, { query }),
        PLATFORM,
      ),
    )
  }

  async listProjectMembers(owner: string, repo: string, query: string, limit: number): Promise<GitlabUser[]> {
    return guarded("gitlab", async () =>
      parseResponse(
        z.array(gitlabUserSchema),
        await this.http()(`${this.projectRoute(owner, repo)}/members/all`, {
          query: { ...(query === "" ? {} : { query }), per_page: limit },
        }),
        PLATFORM,
      ),
    )
  }

  async listLabelNames(owner: string, repo: string, limit: number): Promise<string[]> {
    return guarded("gitlab", async () => {
      const labels = parseResponse(
        labelsSchema,
        await this.http()(`${this.projectRoute(owner, repo)}/labels`, { query: { per_page: limit } }),
        PLATFORM,
      )
      return labels.map((label) => label.name ?? "")
    })
  }

  async readReviewers(owner: string, repo: string, iid: number): Promise<GitlabReviewers> {
    return guarded("gitlab", async () => {
      const route = `${this.projectRoute(owner, repo)}/merge_requests/${String(iid)}`
      const [mergeRequest, approvals] = await Promise.all([
        this.readMergeRequest(owner, repo, iid),
        this.http()(`${route}/approvals`).then(
          (response) => parseResponse(gitlabApprovalsSchema, response, PLATFORM),
          (): GitlabApprovals => ({ approved_by: [] }),
        ),
      ])
      return { mergeRequest, approvals }
    })
  }

  async readMergeRequestActivity(owner: string, repo: string, iid: number, limit: number): Promise<GitlabActivity> {
    return guarded("gitlab", async () => {
      const route = `${this.projectRoute(owner, repo)}/merge_requests/${String(iid)}`
      const [notes, commits] = await Promise.all([
        this.http()(`${route}/notes`, { query: { per_page: limit, sort: "desc", order_by: "created_at" } }),
        this.http()(`${route}/commits`, { query: { per_page: limit } }),
      ])
      return {
        notes: parseResponse(notesSchema, notes, PLATFORM),
        commitDates: parseResponse(commitsSchema, commits, PLATFORM).map((commit) => commit.committed_date),
      }
    })
  }

  async readMergeRequestDiff(owner: string, repo: string, iid: number): Promise<string> {
    return guarded("gitlab", async () => {
      const diff = await this.http()(
        `${this.projectRoute(owner, repo)}/merge_requests/${String(iid)}/raw_diffs`,
        { responseType: "text" },
      )
      return typeof diff === "string" ? diff : JSON.stringify(diff)
    })
  }

  async compareWithDiffs(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<GitlabComparison> {
    return guarded("gitlab", async () =>
      parseResponse(
        gitlabComparisonSchema,
        await this.http()(`${this.projectRoute(owner, repo)}/repository/compare`, { query: { from: base, to: head } }),
        PLATFORM,
      ),
    )
  }

  private http(): ProviderClient {
    return toProviderClient(Reflect.get(this, "client"))
  }

  private projectRoute(owner: string, repo: string): string {
    return `/projects/${encodeURIComponent(`${owner}/${repo}`)}`
  }
}
