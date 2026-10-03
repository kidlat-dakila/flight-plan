import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { BaseGitAdapter } from "@/utils/git-adapter/base"
import { BitbucketAdapter } from "@/utils/git-adapter/bitbucket-adapter"
import { GithubTokenAdapter } from "@/utils/git-adapter/github-token-adapter"
import { GitlabAdapter } from "@/utils/git-adapter/gitlab-adapter"
import { stubGlobalFetch } from "@/utils/git-adapter/helpers/__tests__/stub-global-fetch"
import { recordFetches, type RecordingFetcher } from "./recording-fetcher"

afterEach(() => {
  vi.unstubAllGlobals()
})

const graphqlQueryOf = (body: string): string => z.object({ query: z.string() }).parse(JSON.parse(body)).query

const githubPerson = (login: string, name: string | null): Record<string, unknown> => ({
  login,
  name,
  avatarUrl: `https://avatars.test/${login}.png`,
})

const githubAdapter = (repo = "acme/storefront"): GithubTokenAdapter => new GithubTokenAdapter({ repo, token: "t" })

describe("GitHub people search", () => {
  it("offers the repository's members, then the recent pull request authors that match", async () => {
    stubGlobalFetch({
      "/graphql": {
        data: {
          repository: {
            assignableUsers: { nodes: [githubPerson("Mira", "Mira Sandoval"), null] },
            pullRequests: {
              nodes: [
                { author: githubPerson("teo", "Teo Marchetti") },
                { author: null },
                { author: githubPerson("lena", null) },
                { author: githubPerson("mira", null) },
              ],
            },
          },
        },
      },
    })

    await expect(githubAdapter().searchPeople("m")).resolves.toStrictEqual([
      { login: "Mira", name: "Mira Sandoval", avatarUrl: "https://avatars.test/Mira.png" },
      { login: "teo", name: "Teo Marchetti", avatarUrl: "https://avatars.test/teo.png" },
    ])
  })

  it("asks for the members whose login or name matches, with the typed text as one escaped string", async () => {
    const stub = stubGlobalFetch({ "/graphql": { data: { repository: { pullRequests: { nodes: [] } } } } })

    await githubAdapter().searchPeople(" a\"b ")

    const query = graphqlQueryOf(stub.bodies()[0])
    expect(query).toContain(`assignableUsers(first: 20, query: ${JSON.stringify("a\"b")})`)
    expect(query).toContain("repository(owner: \"acme\", name: \"storefront\")")
  })

  it("asks for every member when nothing is typed", async () => {
    const stub = stubGlobalFetch({ "/graphql": { data: { repository: { pullRequests: { nodes: [] } } } } })

    await githubAdapter().searchPeople("")

    expect(graphqlQueryOf(stub.bodies()[0])).toContain("assignableUsers(first: 20) {")
  })

  it("asks for nothing when the repository name is not a valid slug", async () => {
    const stub = stubGlobalFetch({ "/graphql": { data: {} } })

    await expect(githubAdapter("ac me/store\"front").searchPeople("m")).resolves.toStrictEqual([])
    expect(stub.urls()).toStrictEqual([])
  })

  it.each([
    ["NOT_FOUND", "no-repo"],
    ["FORBIDDEN", "auth"],
  ] as const)("reports a %s answer as the %s problem", async (type, problem) => {
    stubGlobalFetch({ "/graphql": { data: { repository: null }, errors: [{ type }] } })

    await expect(githubAdapter().searchPeople("m")).rejects.toMatchObject({ problem })
  })

  it("reports the people capability", () => {
    expect(githubAdapter().supports("people")).toBe(true)
  })
})

const gitlabAdapter = (): GitlabAdapter => new GitlabAdapter({ repo: "platform/ledger", token: "t", baseUrl: "https://gitlab.acme.test" })

describe("GitLab people search", () => {
  it("offers the project's members, then the recent merge request authors that match", async () => {
    const stub = stubGlobalFetch({
      "/members/all": [{ username: "mira", name: "Mira Sandoval", avatar_url: "/uploads/mira.png" }],
      "/merge_requests": [
        { iid: 1, title: "One", web_url: "u", updated_at: "d", author: { username: "teo", name: "Teo Marchetti", avatar_url: "https://avatars.test/teo.png" } },
        { iid: 2, title: "Two", web_url: "u", updated_at: "d", author: { username: "lena", name: "Lena Okafor" } },
        { iid: 3, title: "Three", web_url: "u", updated_at: "d" },
      ],
    })

    await expect(gitlabAdapter().searchPeople("m")).resolves.toStrictEqual([
      { login: "mira", name: "Mira Sandoval", avatarUrl: "https://gitlab.acme.test/uploads/mira.png" },
      { login: "teo", name: "Teo Marchetti", avatarUrl: "https://avatars.test/teo.png" },
    ])
    const memberRequest = new URL(stub.urls().find((url) => url.includes("/members/all")) ?? "")
    expect(memberRequest.pathname).toBe("/api/v4/projects/platform%2Fledger/members/all")
    expect(Object.fromEntries(memberRequest.searchParams)).toStrictEqual({ query: "m", per_page: "20" })
  })

  it("asks for every member when nothing is typed", async () => {
    const stub = stubGlobalFetch({ "/members/all": [], "/merge_requests": [] })

    await gitlabAdapter().searchPeople("  ")

    const memberRequest = new URL(stub.urls().find((url) => url.includes("/members/all")) ?? "")
    expect(Object.fromEntries(memberRequest.searchParams)).toStrictEqual({ per_page: "20" })
  })

  it("reports the people capability", () => {
    expect(gitlabAdapter().supports("people")).toBe(true)
  })
})

const bitbucketFetcher = (routes: Record<string, unknown>): RecordingFetcher =>
  recordFetches(async (input) => {
    const key = Object.keys(routes).find((route) => input.includes(route))
    return await Promise.resolve(
      key === undefined
        ? new Response("not found", { status: 404 })
        : new Response(JSON.stringify(routes[key]), { status: 200, headers: { "content-type": "application/json" } }),
    )
  })

describe("Bitbucket Cloud people search", () => {
  const routes = {
    "/workspaces/acme/members": {
      values: [
        { user: { nickname: "mira", display_name: "Mira Sandoval", links: { avatar: { href: "https://avatars.test/mira.png" } } } },
        { },
      ],
    },
    "/pullrequests?": {
      values: [
        { author: { nickname: "teo", display_name: "Teo Marchetti" } },
        { author: { nickname: "mira", display_name: "Mira Sandoval" } },
        { },
      ],
    },
  }

  it("offers the workspace members and the recent pull request authors, once each", async () => {
    const recording = bitbucketFetcher(routes)
    const adapter = new BitbucketAdapter({ repo: "acme/ledger", username: "dev", token: "t", fetcher: recording.fetcher })

    await expect(adapter.searchPeople("")).resolves.toStrictEqual([
      { login: "mira", name: "Mira Sandoval", avatarUrl: "https://avatars.test/mira.png" },
      { login: "teo", name: "Teo Marchetti", avatarUrl: "" },
    ])
    const authorRequest = new URL(recording.urls().find((url) => url.includes("/pullrequests?")) ?? "")
    expect(authorRequest.searchParams.get("fields")).toBe("values.author")
  })

  it("keeps the people whose nickname or name contains the typed text", async () => {
    const adapter = new BitbucketAdapter({ repo: "acme/ledger", username: "dev", token: "t", fetcher: bitbucketFetcher(routes).fetcher })

    await expect(adapter.searchPeople("MARCH")).resolves.toMatchObject([{ login: "teo" }])
  })

  it("reports the people capability", () => {
    expect(new BitbucketAdapter({ repo: "acme/ledger", username: "dev", token: "t" }).supports("people")).toBe(true)
  })
})

describe("people search without a forge", () => {
  it("is refused by name", async () => {
    await expect(new BaseGitAdapter({ repo: "acme/storefront" }).searchPeople("m")).rejects.toMatchObject({ problem: "unsupported" })
  })
})
