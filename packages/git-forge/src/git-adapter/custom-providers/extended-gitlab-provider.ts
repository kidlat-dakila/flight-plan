import { GitLabProvider } from "@agntn/forges/gitlab"
import { z } from "zod"
import { GitAdapterError } from "@/git-adapter/types"
import { guarded, parseResponse, toProviderClient, type ProviderClient } from "./provider-client"

const PLATFORM = "GitLab"
const DISCUSSION_PAGE_SIZE = 100
const REQUEST_REVIEW_COMMAND = "/request_review"
const USER_PREFIX = "@"
const REFUSED_MESSAGE = "GitLab refused the change."

const mutationErrorsSchema = z.array(z.union([z.string(), z.object({ message: z.string().optional() })])).nullable().optional()

const requestChangesResponseSchema = z.object({
  data: z.object({ mergeRequestRequestChanges: z.object({ errors: mutationErrorsSchema }).nullable().optional() }).nullable().optional(),
  errors: mutationErrorsSchema,
})

const messageOf = (error: string | { message?: string }): string => (typeof error === "string" ? error : (error.message ?? ""))

export function buildRequestChangesMutation(projectPath: string, iid: number): string {
  return `mutation {
  mergeRequestRequestChanges(input: { projectPath: ${JSON.stringify(projectPath)}, iid: ${JSON.stringify(String(iid))} }) {
    errors
  }
}`
}

const gitlabUserSchema = z.object({
  id: z.number().optional(),
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
  diff_refs: z
    .object({ base_sha: z.string().optional(), start_sha: z.string().optional(), head_sha: z.string().optional() })
    .optional(),
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

const linePointSchema = z.object({ old_line: z.number().nullable().optional(), new_line: z.number().nullable().optional() })

const discussionNoteSchema = z.object({
  id: z.number(),
  body: z.string(),
  author: gitlabUserSchema,
  created_at: z.string(),
  system: z.boolean().optional(),
  resolved: z.boolean().optional(),
  position: linePointSchema
    .extend({
      old_path: z.string().nullable().optional(),
      new_path: z.string().nullable().optional(),
      line_range: z.object({ start: linePointSchema.optional(), end: linePointSchema.optional() }).nullable().optional(),
    })
    .nullable()
    .optional(),
})

const discussionsSchema = z.array(z.object({ id: z.string(), notes: z.array(discussionNoteSchema) }))

export type GitlabUser = z.infer<typeof gitlabUserSchema>

export type GitlabDiscussionNote = z.infer<typeof discussionNoteSchema>

export type GitlabDiscussion = z.infer<typeof discussionsSchema>[number]

export interface GitlabLinePoint {
  line_code: string
  type: "old" | "new"
  old_line?: number
  new_line?: number
}

export interface GitlabDiffPosition {
  position_type: "text"
  base_sha: string
  start_sha: string
  head_sha: string
  old_path: string
  new_path: string
  old_line?: number
  new_line?: number
  line_range?: { start: GitlabLinePoint, end: GitlabLinePoint }
}

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

  async readDiscussions(owner: string, repo: string, iid: number): Promise<GitlabDiscussion[]> {
    return guarded("gitlab", async () =>
      parseResponse(
        discussionsSchema,
        await this.http()(`${this.mergeRequestRoute(owner, repo, iid)}/discussions`, { query: { per_page: DISCUSSION_PAGE_SIZE } }),
        PLATFORM,
      ),
    )
  }

  async postDiffDiscussion(owner: string, repo: string, iid: number, body: string, position: GitlabDiffPosition): Promise<void> {
    await this.write(`${this.mergeRequestRoute(owner, repo, iid)}/discussions`, "POST", { body, position })
  }

  async postNote(owner: string, repo: string, iid: number, body: string): Promise<void> {
    await this.write(`${this.mergeRequestRoute(owner, repo, iid)}/notes`, "POST", { body })
  }

  async postDiscussionReply(owner: string, repo: string, iid: number, discussionId: string, body: string): Promise<void> {
    await this.write(`${this.discussionRoute(owner, repo, iid, discussionId)}/notes`, "POST", { body })
  }

  async markDiscussionResolved(owner: string, repo: string, iid: number, discussionId: string, isResolved: boolean): Promise<void> {
    await this.write(this.discussionRoute(owner, repo, iid, discussionId), "PUT", { resolved: isResolved })
  }

  async requestChanges(graphqlPath: string, owner: string, repo: string, iid: number): Promise<void> {
    await guarded("gitlab", async () => {
      const response = parseResponse(
        requestChangesResponseSchema,
        await this.http()(graphqlPath, { method: "POST", body: { query: buildRequestChangesMutation(`${owner}/${repo}`, iid) } }),
        PLATFORM,
      )
      const reasons = [...(response.errors ?? []), ...(response.data?.mergeRequestRequestChanges?.errors ?? [])]
        .map(messageOf)
        .filter((reason) => reason !== "")
      if (reasons.length > 0 || response.data?.mergeRequestRequestChanges == null) {
        throw new GitAdapterError(reasons.at(0) ?? REFUSED_MESSAGE)
      }
    })
  }

  async requestReviewAgain(owner: string, repo: string, iid: number, username: string): Promise<void> {
    await this.postNote(owner, repo, iid, `${REQUEST_REVIEW_COMMAND} ${USER_PREFIX}${username}`)
  }

  async approveMergeRequest(owner: string, repo: string, iid: number): Promise<void> {
    await this.write(`${this.mergeRequestRoute(owner, repo, iid)}/approve`, "POST", {})
  }

  async setReviewerIds(owner: string, repo: string, iid: number, reviewerIds: readonly number[]): Promise<void> {
    await this.write(this.mergeRequestRoute(owner, repo, iid), "PUT", { reviewer_ids: [...reviewerIds] })
  }

  async findUsersByUsername(username: string): Promise<GitlabUser[]> {
    return guarded("gitlab", async () =>
      parseResponse(z.array(gitlabUserSchema), await this.http()("/users", { query: { username } }), PLATFORM),
    )
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

  private mergeRequestRoute(owner: string, repo: string, iid: number): string {
    return `${this.projectRoute(owner, repo)}/merge_requests/${String(iid)}`
  }

  private discussionRoute(owner: string, repo: string, iid: number, discussionId: string): string {
    return `${this.mergeRequestRoute(owner, repo, iid)}/discussions/${encodeURIComponent(discussionId)}`
  }

  private async write(path: string, method: "POST" | "PUT", body: Record<string, unknown>): Promise<void> {
    await guarded("gitlab", async () => await this.http()(path, { method, body }))
  }
}
