import type { Rest } from "@/git-adapter/helpers/rest"
import { GitAdapterError } from "@/git-adapter/types"
import {
  dataCenterActivitySchema,
  dataCenterCommentSchema,
  dataCenterCommitSchema,
  dataCenterPageSchema,
  dataCenterPullRequestSchema,
  dataCenterUserSchema,
  type DataCenterActivity,
  type DataCenterComment,
  type DataCenterCommit,
  type DataCenterPullRequest,
  type DataCenterUser,
} from "./bitbucket-data-center-raw"
import { parseResponse } from "./provider-client"

const PLATFORM = "Bitbucket Data Center"
const PAGE_LIMIT = 100
const MAX_PAGES = 5
const AVATAR_SIZE = 64
const AUTHOR_ROLE = "AUTHOR"
const JSON_HEADERS = { "content-type": "application/json" }
const APPLICATION_PROPERTIES_PATH = "application-properties"
const SIGNED_IN_USER_HEADER = "x-ausername"

export type DataCenterLineType = "ADDED" | "REMOVED" | "CONTEXT"

export interface DataCenterCommentAnchor {
  readonly path: string
  readonly line: number
  readonly lineType: DataCenterLineType
  readonly fileType: "FROM" | "TO"
  readonly diffType: "EFFECTIVE"
  readonly multilineMarker?: { readonly startLine: number, readonly startLineType: DataCenterLineType }
}

export interface DataCenterCommentInput {
  readonly text: string
  readonly anchor?: DataCenterCommentAnchor
  readonly parent?: { readonly id: number }
}

export type DataCenterReviewStatus = "APPROVED" | "NEEDS_WORK"

export interface DataCenterReviewersUpdate {
  readonly version: number
  readonly title: string
  readonly reviewerNames: readonly string[]
}

export interface DataCenterQuery {
  readonly state: "OPEN" | "ALL"
  readonly limit: number
  readonly authorSlug?: string
}

export interface DataCenterActivityPage {
  readonly activities: DataCenterActivity[]
  readonly commits: DataCenterCommit[]
}

export interface BitbucketDataCenterClientOptions {
  readonly rest: Rest
  readonly webRoot: string
}

export const slugOf = (user: DataCenterUser | undefined): string => (user?.slug ?? user?.name ?? "").toLowerCase()

const isAuthoredBy = (pullRequest: DataCenterPullRequest, authorSlug: string | undefined): boolean =>
  authorSlug === undefined || slugOf(pullRequest.author?.user) === authorSlug.toLowerCase()

export class BitbucketDataCenterClient {
  private readonly rest: Rest
  private readonly webRoot: string

  public constructor({ rest, webRoot }: BitbucketDataCenterClientOptions) {
    this.rest = rest
    this.webRoot = webRoot
  }

  public readonly readViewer = async (): Promise<DataCenterUser> => {
    const answer = await this.rest.request(APPLICATION_PROPERTIES_PATH)
    const slug = (answer.headers.get(SIGNED_IN_USER_HEADER) ?? "").trim()
    await answer.body?.cancel()
    if (slug === "") throw new GitAdapterError("Bitbucket Data Center does not know who is signed in.", "auth")
    return parseResponse(
      dataCenterUserSchema,
      await this.rest.json(`users/${encodeURIComponent(slug)}?avatarSize=${String(AVATAR_SIZE)}`),
      PLATFORM,
    )
  }

  public readonly searchUsers = async (query: string, limit: number): Promise<DataCenterUser[]> => {
    const parameters = new URLSearchParams({ limit: String(limit), avatarSize: String(AVATAR_SIZE) })
    if (query !== "") parameters.set("filter", query)
    const page = parseResponse(
      dataCenterPageSchema(dataCenterUserSchema),
      await this.rest.json(`users?${parameters.toString()}`),
      PLATFORM,
    )
    return page.values ?? []
  }

  public readonly readPullRequest = async (project: string, repo: string, id: number): Promise<DataCenterPullRequest> =>
    parseResponse(
      dataCenterPullRequestSchema,
      await this.rest.json(`${this.repoPath(project, repo)}/pull-requests/${String(id)}?avatarSize=${String(AVATAR_SIZE)}`),
      PLATFORM,
    )

  public readonly listPullRequests = async (
    project: string,
    repo: string,
    query: DataCenterQuery,
  ): Promise<DataCenterPullRequest[]> => {
    const parameters = new URLSearchParams({
      state: query.state,
      order: "NEWEST",
      limit: String(PAGE_LIMIT),
      avatarSize: String(AVATAR_SIZE),
    })
    if (query.authorSlug !== undefined) {
      parameters.set("role.1", AUTHOR_ROLE)
      parameters.set("username.1", query.authorSlug)
    }
    return await this.collectPullRequests(`${this.repoPath(project, repo)}/pull-requests`, parameters, query, {
      start: 0,
      pageNumber: 1,
      kept: [],
    })
  }

  public readonly readPullRequestActivity = async (
    project: string,
    repo: string,
    id: number,
    limit: number,
  ): Promise<DataCenterActivityPage> => {
    const route = `${this.repoPath(project, repo)}/pull-requests/${String(id)}`
    const [activities, commits] = await Promise.all([
      this.rest.json(`${route}/activities?limit=${String(limit)}`),
      this.rest.json(`${route}/commits?limit=${String(limit)}`),
    ])
    return {
      activities: parseResponse(dataCenterPageSchema(dataCenterActivitySchema), activities, PLATFORM).values ?? [],
      commits: parseResponse(dataCenterPageSchema(dataCenterCommitSchema), commits, PLATFORM).values ?? [],
    }
  }

  public readonly readDiscussionActivities = async (project: string, repo: string, id: number): Promise<DataCenterActivity[]> => {
    const page = parseResponse(
      dataCenterPageSchema(dataCenterActivitySchema),
      await this.rest.json(`${this.pullRequestPath(project, repo, id)}/activities?limit=${String(PAGE_LIMIT)}&avatarSize=${String(AVATAR_SIZE)}`),
      PLATFORM,
    )
    return page.values ?? []
  }

  public readonly postComment = async (project: string, repo: string, id: number, input: DataCenterCommentInput): Promise<void> => {
    await this.send(`${this.pullRequestPath(project, repo, id)}/comments`, "POST", input)
  }

  public readonly readComment = async (project: string, repo: string, id: number, commentId: number): Promise<DataCenterComment> =>
    parseResponse(
      dataCenterCommentSchema,
      await this.rest.json(`${this.pullRequestPath(project, repo, id)}/comments/${String(commentId)}`),
      PLATFORM,
    )

  public readonly markThreadResolved = async (
    project: string,
    repo: string,
    id: number,
    comment: Pick<DataCenterComment, "id" | "version">,
    isResolved: boolean,
  ): Promise<void> => {
    await this.send(`${this.pullRequestPath(project, repo, id)}/comments/${String(comment.id)}`, "PUT", {
      version: comment.version ?? 0,
      threadResolved: isResolved,
    })
  }

  public readonly setParticipantStatus = async (
    project: string,
    repo: string,
    id: number,
    userSlug: string,
    status: DataCenterReviewStatus,
  ): Promise<void> => {
    await this.send(`${this.pullRequestPath(project, repo, id)}/participants/${encodeURIComponent(userSlug)}`, "PUT", { status })
  }

  public readonly setReviewers = async (project: string, repo: string, id: number, update: DataCenterReviewersUpdate): Promise<void> => {
    await this.send(this.pullRequestPath(project, repo, id), "PUT", {
      id,
      version: update.version,
      title: update.title,
      reviewers: update.reviewerNames.map((name) => ({ user: { name } })),
    })
  }

  private readonly send = async (path: string, method: "POST" | "PUT", body: unknown): Promise<void> => {
    await this.rest.request(path, { method, headers: JSON_HEADERS, body: JSON.stringify(body) })
  }

  private readonly pullRequestPath = (project: string, repo: string, id: number): string =>
    `${this.repoPath(project, repo)}/pull-requests/${String(id)}`

  private readonly collectPullRequests = async (
    route: string,
    parameters: URLSearchParams,
    query: DataCenterQuery,
    progress: { readonly start: number, readonly pageNumber: number, readonly kept: readonly DataCenterPullRequest[] },
  ): Promise<DataCenterPullRequest[]> => {
    const pageParameters = new URLSearchParams(parameters)
    pageParameters.set("start", String(progress.start))
    const page = parseResponse(
      dataCenterPageSchema(dataCenterPullRequestSchema),
      await this.rest.json(`${route}?${pageParameters.toString()}`),
      PLATFORM,
    )
    const kept = [...progress.kept, ...(page.values ?? []).filter((pullRequest) => isAuthoredBy(pullRequest, query.authorSlug))]
    const isDone = page.isLastPage !== false || page.nextPageStart === undefined || kept.length >= query.limit || progress.pageNumber >= MAX_PAGES
    return isDone
      ? kept.slice(0, query.limit)
      : await this.collectPullRequests(route, parameters, query, {
          start: page.nextPageStart ?? 0,
          pageNumber: progress.pageNumber + 1,
          kept,
        })
  }

  private readonly repoPath = (project: string, repo: string): string =>
    `projects/${encodeURIComponent(project)}/repos/${encodeURIComponent(repo)}`
}
