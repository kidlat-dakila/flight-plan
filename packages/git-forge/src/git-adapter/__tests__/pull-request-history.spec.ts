import { afterEach, describe, expect, it, vi } from "vitest"
import { BitbucketAdapter } from "@/git-adapter/bitbucket-adapter"
import { GithubTokenAdapter } from "@/git-adapter/github-token-adapter"
import { GitlabAdapter } from "@/git-adapter/gitlab-adapter"
import { stubGlobalFetch } from "@/git-adapter/helpers/__tests__/stub-global-fetch"
import type { Fetcher } from "@/git-adapter/types"
import { recordFetches } from "./recording-fetcher"

afterEach(() => {
  vi.unstubAllGlobals()
})

const respondWith = (routes: Record<string, unknown>): Fetcher =>
  async (input) => {
    const key = Object.keys(routes).find((route) => input.includes(route))
    return await Promise.resolve(
      key === undefined
        ? new Response("not found", { status: 404 })
        : new Response(JSON.stringify(routes[key]), { status: 200, headers: { "content-type": "application/json" } }),
    )
  }

const githubNode = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  number: 12,
  title: "Retry webhooks",
  state: "OPEN",
  isDraft: false,
  createdAt: "2026-10-01T08:00:00Z",
  updatedAt: "2026-10-01T09:00:00Z",
  headRefName: "fix/webhook-retry",
  author: { login: "mira", avatarUrl: "https://avatars.test/mira.png" },
  reviewRequests: { nodes: [{ requestedReviewer: { login: "teo" } }, { requestedReviewer: {} }, null] },
  reviews: { nodes: [{ author: { login: "dev" }, submittedAt: "2026-10-01T10:00:00Z" }, { author: null, submittedAt: null }] },
  comments: { nodes: [{ author: { login: "mira" }, createdAt: "2026-10-01T11:00:00Z" }] },
  reviewThreads: { nodes: [{ comments: { nodes: [{ author: { login: "dev" }, createdAt: "2026-10-01T10:30:00Z" }] } }] },
  commits: { nodes: [{ commit: { committedDate: "2026-10-01T07:00:00Z" } }] },
  ...overrides,
})

const githubAdapter = (): GithubTokenAdapter => new GithubTokenAdapter({ repo: "acme/storefront", token: "t" })

describe("GitHub pull request history", () => {
  it("reads the signed-in user", async () => {
    stubGlobalFetch({ "/user": { login: "dev", name: "Dev Harper", avatar_url: "https://avatars.test/dev.png" } })

    await expect(githubAdapter().viewer()).resolves.toStrictEqual({
      login: "dev",
      name: "Dev Harper",
      avatarUrl: "https://avatars.test/dev.png",
    })
  })

  it("searches the pull requests of each author in every state with one GraphQL request", async () => {
    const stub = stubGlobalFetch({ "/graphql": { data: { a0: { nodes: [githubNode()] }, a1: { nodes: [githubNode(), null] } } } })

    const histories = await githubAdapter().listPullRequests({ authors: ["dev", "@mira"], limit: 15 })

    expect(stub.urls()).toStrictEqual(["https://api.github.com/graphql"])
    expect(stub.bodies()[0]).toContain("author:dev sort:updated-desc")
    expect(stub.bodies()[0]).toContain("author:mira sort:updated-desc")
    expect(histories).toStrictEqual([
      {
        number: 12,
        title: "Retry webhooks",
        headBranch: "fix/webhook-retry",
        state: "open",
        isDraft: false,
        author: { login: "mira", avatarUrl: "https://avatars.test/mira.png" },
        createdAt: "2026-10-01T08:00:00Z",
        updatedAt: "2026-10-01T09:00:00Z",
        requestedReviewers: ["teo"],
        discussion: [
          { login: "dev", at: "2026-10-01T10:00:00Z" },
          { login: "mira", at: "2026-10-01T11:00:00Z" },
          { login: "dev", at: "2026-10-01T10:30:00Z" },
        ],
        commitDates: ["2026-10-01T07:00:00Z"],
      },
    ])
  })

  it.each([
    ["MERGED", "merged"],
    ["CLOSED", "closed"],
  ] as const)("reads the state %s", async (state, expected) => {
    stubGlobalFetch({ "/graphql": { data: { a0: { nodes: [githubNode({ state })] } } } })

    await expect(githubAdapter().listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toMatchObject([{ state: expected }])
  })

  it("searches the repository's latest pull requests of every author with one GraphQL request", async () => {
    const stub = stubGlobalFetch({ "/graphql": { data: { recent: { nodes: [githubNode(), null] } } } })

    const histories = await githubAdapter().listRecentPullRequests(50)

    expect(stub.bodies()[0]).toContain("repo:acme/storefront is:pr sort:updated-desc")
    expect(stub.bodies()[0]).not.toContain("author:")
    expect(stub.bodies()[0]).toContain("first: 50")
    expect(histories.map((history) => history.number)).toStrictEqual([12])
  })

  it("names a deleted author ghost", async () => {
    stubGlobalFetch({ "/graphql": { data: { a0: { nodes: [githubNode({ author: null })] } } } })

    await expect(githubAdapter().listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toMatchObject([
      { author: { login: "ghost", avatarUrl: "" } },
    ])
  })

  it("asks for nothing when no author is a valid login", async () => {
    const stub = stubGlobalFetch({ "/graphql": { data: {} } })

    await expect(githubAdapter().listPullRequests({ authors: ["x\" } mutation", "lena@acme.test"], limit: 15 })).resolves.toStrictEqual([])
    expect(stub.urls()).toStrictEqual([])
  })

  it.each([
    ["NOT_FOUND", "no-repo"],
    ["FORBIDDEN", "auth"],
  ] as const)("reports a %s error as the %s problem", async (type, problem) => {
    stubGlobalFetch({ "/graphql": { data: null, errors: [{ type }] } })

    await expect(githubAdapter().listPullRequests({ authors: ["mira"], limit: 15 })).rejects.toMatchObject({ problem })
  })

  it("reports an unreadable answer as a network problem", async () => {
    stubGlobalFetch({ "/graphql": { data: { a0: { nodes: [{ number: "x" }] } } } })

    await expect(githubAdapter().listPullRequests({ authors: ["mira"], limit: 15 })).rejects.toMatchObject({ problem: "network" })
  })

  it("reports the history capability", () => {
    expect(githubAdapter().supports("history")).toBe(true)
  })
})

const mergeRequest = (iid: number, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  iid,
  title: `Merge request ${String(iid)}`,
  state: "opened",
  draft: false,
  source_branch: `feature/${String(iid)}`,
  created_at: "2026-10-01T08:00:00Z",
  updated_at: "2026-10-01T09:00:00Z",
  web_url: `https://gitlab.acme.test/platform/ledger/-/merge_requests/${String(iid)}`,
  author: { username: "mira", avatar_url: "/uploads/mira.png" },
  reviewers: [{ username: "teo" }],
  ...overrides,
})

const note = (username: string, createdAt: string, isSystem = false, body = "Looks odd"): Record<string, unknown> => ({
  author: { username },
  created_at: createdAt,
  system: isSystem,
  body,
})

const gitlabAdapter = (): GitlabAdapter => new GitlabAdapter({ repo: "platform/ledger", token: "t", baseUrl: "https://gitlab.acme.test" })

describe("GitLab merge request history", () => {
  it("reads the signed-in user", async () => {
    stubGlobalFetch({ "/user": { username: "dev", name: "Dev Harper", avatar_url: "https://avatars.test/dev.png" } })

    await expect(gitlabAdapter().viewer()).resolves.toStrictEqual({
      login: "dev",
      name: "Dev Harper",
      avatarUrl: "https://avatars.test/dev.png",
    })
  })

  it("lists the merge requests of each author in every state", async () => {
    const stub = stubGlobalFetch({ "/merge_requests": [] })

    await gitlabAdapter().listPullRequests({ authors: ["dev", "@mira", "DEV"], limit: 15 })

    const listings = stub.urls().map((url) => new URL(url))
    expect(listings.map((url) => url.searchParams.get("author_username"))).toStrictEqual(["dev", "mira"])
    expect(listings[0].pathname).toBe("/api/v4/projects/platform%2Fledger/merge_requests")
    expect(Object.fromEntries(listings[0].searchParams)).toMatchObject({ state: "all", order_by: "updated_at", sort: "desc", per_page: "15" })
  })

  it("lists the latest merge requests of every author in every state", async () => {
    const stub = stubGlobalFetch({ "/merge_requests": [] })

    await gitlabAdapter().listRecentPullRequests(50)

    const listings = stub.urls().map((url) => new URL(url))
    expect(listings).toHaveLength(1)
    expect(listings[0].searchParams.has("author_username")).toBe(false)
    expect(Object.fromEntries(listings[0].searchParams)).toMatchObject({ state: "all", order_by: "updated_at", sort: "desc", per_page: "50" })
  })

  it("maps an open merge request with its notes and commits", async () => {
    stubGlobalFetch({
      "/merge_requests/5/notes": [
        note("dev", "2026-10-01T10:00:00Z"),
        note("mira", "2026-10-01T10:30:00Z", true, "added 1 commit"),
        note("teo", "2026-10-01T11:00:00Z", true, "approved this merge request"),
      ],
      "/merge_requests/5/commits": [{ committed_date: "2026-10-01T07:00:00Z" }],
      "/merge_requests": [mergeRequest(5)],
    })

    await expect(gitlabAdapter().listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toStrictEqual([
      {
        number: 5,
        title: "Merge request 5",
        headBranch: "feature/5",
        state: "open",
        isDraft: false,
        author: { login: "mira", name: undefined, avatarUrl: "https://gitlab.acme.test/uploads/mira.png" },
        createdAt: "2026-10-01T08:00:00Z",
        updatedAt: "2026-10-01T09:00:00Z",
        requestedReviewers: ["teo"],
        discussion: [
          { login: "dev", at: "2026-10-01T10:00:00Z" },
          { login: "teo", at: "2026-10-01T11:00:00Z" },
        ],
        commitDates: ["2026-10-01T07:00:00Z"],
      },
    ])
  })

  it.each([
    ["merged", "merged"],
    ["closed", "closed"],
    ["locked", "closed"],
  ] as const)("reads the state %s without reading the discussion", async (state, expected) => {
    const stub = stubGlobalFetch({ "/merge_requests": [mergeRequest(6, { state })] })

    await expect(gitlabAdapter().listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toMatchObject([{ state: expected, discussion: [] }])
    expect(stub.urls().some((url) => url.includes("/notes"))).toBe(false)
  })

  it("reads a draft without reading the discussion", async () => {
    const stub = stubGlobalFetch({ "/merge_requests": [mergeRequest(7, { draft: true })] })

    await expect(gitlabAdapter().listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toMatchObject([{ isDraft: true }])
    expect(stub.urls().some((url) => url.includes("/notes"))).toBe(false)
  })

  it("lists a merge request found under several authors once", async () => {
    stubGlobalFetch({ "/merge_requests": [mergeRequest(8, { state: "merged" })] })

    await expect(gitlabAdapter().listPullRequests({ authors: ["mira", "dev"], limit: 15 })).resolves.toHaveLength(1)
  })
})

const bitbucketPullRequest = (id: number, nickname: string, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  title: `Pull request ${String(id)}`,
  state: "OPEN",
  draft: false,
  author: { nickname, links: { avatar: { href: `https://avatars.test/${nickname}.png` } } },
  source: { branch: { name: `feature/${String(id)}` } },
  created_on: "2026-10-01T08:00:00+00:00",
  updated_on: "2026-10-01T09:00:00+00:00",
  ...overrides,
})

const withParticipants = (pullRequest: Record<string, unknown>): Record<string, unknown> => ({
  ...pullRequest,
  reviewers: [{ nickname: "teo" }],
  participants: [
    { user: { nickname: "teo" }, approved: true, participated_on: "2026-10-01T12:00:00+00:00" },
    { user: { nickname: "lena" }, approved: false, participated_on: null },
  ],
})

const bitbucketAdapter = (routes: Record<string, unknown>): { adapter: BitbucketAdapter, urls: () => string[] } => {
  const { fetcher, urls } = recordFetches(respondWith(routes))
  return { adapter: new BitbucketAdapter({ repo: "acme/ledger", username: "dev", token: "t", fetcher }), urls }
}

const routesFor = (listed: Record<string, unknown>[]): Record<string, unknown> => ({
  "/pullrequests/3/comments": { values: [{ user: { nickname: "dev" }, created_on: "2026-10-01T10:00:00+00:00" }] },
  "/pullrequests/3/commits": { values: [{ date: "2026-10-01T07:00:00+00:00" }] },
  "/pullrequests/3": withParticipants(bitbucketPullRequest(3, "mira")),
  "/pullrequests?": { values: listed },
})

describe("Bitbucket pull request history", () => {
  it("reads the signed-in user", async () => {
    const { adapter } = bitbucketAdapter({ "/user": { nickname: "dev", display_name: "Dev Harper" } })

    await expect(adapter.viewer()).resolves.toStrictEqual({ login: "dev", name: "Dev Harper", avatarUrl: "" })
  })

  it("asks Bitbucket for the pull requests of each author in every state, newest update first", async () => {
    const { adapter, urls } = bitbucketAdapter({ "/pullrequests?": { values: [] } })

    await adapter.listPullRequests({ authors: ["dev", "@mira", "DEV"], limit: 15 })

    const listings = urls().map((url) => new URL(url))
    expect(listings.map((url) => url.searchParams.get("q"))).toStrictEqual([
      "author.nickname = \"dev\"",
      "author.nickname = \"mira\"",
    ])
    expect(listings[0].searchParams.getAll("state")).toStrictEqual(["OPEN", "MERGED", "DECLINED", "SUPERSEDED"])
    expect(Object.fromEntries(listings[0].searchParams)).toMatchObject({ sort: "-updated_on", pagelen: "15" })
  })

  it("asks Bitbucket for the latest pull requests of every author in every state", async () => {
    const { adapter, urls } = bitbucketAdapter({ "/pullrequests?": { values: [] } })

    await adapter.listRecentPullRequests(50)

    const listings = urls().map((url) => new URL(url))
    expect(listings).toHaveLength(1)
    expect(listings[0].searchParams.has("q")).toBe(false)
    expect(listings[0].searchParams.getAll("state")).toStrictEqual(["OPEN", "MERGED", "DECLINED", "SUPERSEDED"])
    expect(Object.fromEntries(listings[0].searchParams)).toMatchObject({ sort: "-updated_on", pagelen: "50" })
  })

  it("escapes quotes and backslashes in an author's name", async () => {
    const { adapter, urls } = bitbucketAdapter({ "/pullrequests?": { values: [] } })

    await adapter.listPullRequests({ authors: ["a\"b\\c"], limit: 15 })

    expect(new URL(urls()[0]).searchParams.get("q")).toBe("author.nickname = \"a\\\"b\\\\c\"")
  })

  it("reads the reviewers and approvals of an open pull request from the pull request itself", async () => {
    const { adapter } = bitbucketAdapter(routesFor([bitbucketPullRequest(3, "mira")]))

    await expect(adapter.listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toStrictEqual([
      {
        number: 3,
        title: "Pull request 3",
        headBranch: "feature/3",
        state: "open",
        isDraft: false,
        author: { login: "mira", name: undefined, avatarUrl: "https://avatars.test/mira.png" },
        createdAt: "2026-10-01T08:00:00+00:00",
        updatedAt: "2026-10-01T09:00:00+00:00",
        requestedReviewers: ["teo"],
        discussion: [
          { login: "dev", at: "2026-10-01T10:00:00+00:00" },
          { login: "teo", at: "2026-10-01T12:00:00+00:00" },
        ],
        commitDates: ["2026-10-01T07:00:00+00:00"],
      },
    ])
  })

  it.each([
    ["a merged pull request", { state: "MERGED" }, "merged"],
    ["a declined pull request", { state: "DECLINED" }, "closed"],
    ["a draft", { draft: true }, "open"],
  ] as const)("reads %s without reading its discussion", async (_name, overrides, expectedState) => {
    const { adapter, urls } = bitbucketAdapter({ "/pullrequests?": { values: [bitbucketPullRequest(5, "dev", overrides)] } })

    await expect(adapter.listPullRequests({ authors: ["dev"], limit: 15 })).resolves.toMatchObject([
      { number: 5, state: expectedState, discussion: [], requestedReviewers: [] },
    ])
    expect(urls().some((url) => url.includes("/pullrequests/5"))).toBe(false)
  })

  it("lists a pull request found under several authors once", async () => {
    const { adapter } = bitbucketAdapter({ "/pullrequests?": { values: [bitbucketPullRequest(8, "dev", { state: "MERGED" })] } })

    await expect(adapter.listPullRequests({ authors: ["dev", "mira"], limit: 15 })).resolves.toHaveLength(1)
  })
})
