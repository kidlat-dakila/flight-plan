import { describe, expect, it } from "vitest"
import { BaseGitAdapter } from "@/git-adapter/base"
import {
  BitbucketDataCenterAdapter,
  dataCenterWebRoot,
  splitProject,
} from "@/git-adapter/bitbucket-data-center-adapter"
import { GitAdapterError } from "@/git-adapter/types"
import { recordFetches, type RecordingFetcher } from "./recording-fetcher"
import { repositoryWithBranch } from "./repository-with-branch"

type Body = string | Record<string, unknown>

type Answer = Body | ((url: URL) => Body)

type Recording = RecordingFetcher

const BASE_URL = "https://bitbucket.acme.test/bitbucket"
const TOKEN_AUTHORIZATION = "Bearer s3cret"

const respondTo = (answers: readonly (readonly [string, Answer])[]): Recording =>
  recordFetches(async (input) => {
    const match = answers.find(([fragment]) => input.includes(fragment))
    if (match === undefined) return await Promise.resolve(new Response("not found", { status: 404 }))
    const answer = typeof match[1] === "function" ? match[1](new URL(input)) : match[1]
    return await Promise.resolve(
      typeof answer === "string"
        ? new Response(answer, { status: 200 })
        : new Response(JSON.stringify(answer), { status: 200, headers: { "content-type": "application/json" } }),
    )
  })

const requestedUrls = (recording: Recording): URL[] => recording.urls().map((url) => new URL(url))

const adapterOn = (recording: Recording, overrides: { root?: string } = {}): BitbucketDataCenterAdapter =>
  new BitbucketDataCenterAdapter({
    repo: "bitbucket/scm/PROJ/ledger",
    token: "s3cret",
    baseUrl: BASE_URL,
    fetcher: recording.fetcher,
    ...overrides,
  })

const user = (slug: string, displayName: string): Record<string, unknown> => ({
  name: slug,
  slug,
  displayName,
  avatarUrl: `/bitbucket/users/${slug}/avatar.png?s=64`,
})

const participant = (slug: string, status = "UNAPPROVED"): Record<string, unknown> => ({
  user: user(slug, slug.toUpperCase()),
  role: "REVIEWER",
  approved: status === "APPROVED",
  status,
})

const pullRequest = (id: number, authorSlug: string, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  title: `Pull request ${String(id)}`,
  state: "OPEN",
  draft: false,
  createdDate: Date.parse("2026-10-01T08:00:00Z"),
  updatedDate: Date.parse("2026-10-01T09:00:00Z"),
  fromRef: { id: `refs/heads/feature/${String(id)}`, displayId: `feature/${String(id)}`, latestCommit: `head${String(id)}` },
  toRef: { id: "refs/heads/main", displayId: "main", latestCommit: "basecommit" },
  author: { user: user(authorSlug, authorSlug.toUpperCase()), role: "AUTHOR" },
  reviewers: [participant("teo")],
  links: { self: [{ href: `${BASE_URL}/projects/PROJ/repos/ledger/pull-requests/${String(id)}` }] },
  ...overrides,
})

const page = (values: readonly object[], extra: Record<string, unknown> = {}): Record<string, unknown> => ({ values, isLastPage: true, ...extra })

describe("addressing a repository", () => {
  it("keeps the context path of the instance and drops the REST suffix", () => {
    expect(dataCenterWebRoot("https://bitbucket.acme.test/bitbucket/")).toBe("https://bitbucket.acme.test/bitbucket")
    expect(dataCenterWebRoot("https://bitbucket.acme.test/rest/api/1.0")).toBe("https://bitbucket.acme.test")
  })

  it.each([
    ["PROJ/ledger", { project: "PROJ", slug: "ledger" }],
    ["bitbucket/scm/PROJ/ledger", { project: "PROJ", slug: "ledger" }],
    ["~jdoe/notes", { project: "~jdoe", slug: "notes" }],
  ])("reads the project and repository of %s", (repo, expected) => {
    expect(splitProject(repo)).toStrictEqual(expected)
  })
})

describe("BitbucketDataCenterAdapter", () => {
  it("is a BaseGitAdapter that declares the host capabilities", () => {
    const adapter = adapterOn(respondTo([]))

    expect(adapter).toBeInstanceOf(BaseGitAdapter)
    expect(adapter.id).toBe("bitbucket")
    expect(adapter.supports("history")).toBe(true)
    expect(adapter.supports("people")).toBe(true)
    expect(adapter.supports("labels")).toBe(false)
    expect(adapter.supports("filters")).toBe(false)
  })

  it("signs every request with the token as a bearer", async () => {
    const recording = respondTo([["/pull-requests", page([])]])

    await adapterOn(recording).listTargets({})

    expect(recording.headers().map((headers) => headers.get("authorization"))).toStrictEqual([TOKEN_AUTHORIZATION])
  })

  it("reads the signed-in user from the username header of a REST answer, then the user record", async () => {
    const recording = recordFetches(async (input) => await Promise.resolve(
      input.includes("/application-properties")
        ? new Response(JSON.stringify({ version: "9.4.0" }), { status: 200, headers: { "x-ausername": "dev" } })
        : new Response(JSON.stringify(user("dev", "Dev Harper")), { status: 200 }),
    ))

    await expect(adapterOn(recording).viewer()).resolves.toStrictEqual({
      login: "dev",
      name: "Dev Harper",
      avatarUrl: "https://bitbucket.acme.test/bitbucket/users/dev/avatar.png?s=64",
    })
    expect(requestedUrls(recording).map((url) => url.pathname)).toStrictEqual([
      "/bitbucket/rest/api/1.0/application-properties",
      "/bitbucket/rest/api/1.0/users/dev",
    ])
  })

  it("asks who is signed in only under /rest, where Bitbucket accepts an HTTP access token", async () => {
    const recording = recordFetches(async (input) => await Promise.resolve(
      new URL(input).pathname.startsWith("/bitbucket/rest/")
        ? new Response(JSON.stringify(user("dev", "Dev Harper")), { status: 200, headers: { "x-ausername": "dev" } })
        : new Response("", { status: 401 }),
    ))

    await expect(adapterOn(recording).viewer()).resolves.toMatchObject({ login: "dev" })
  })

  it("reports an anonymous session as an authentication problem", async () => {
    const recording = respondTo([["/application-properties", { version: "9.4.0" }]])

    await expect(adapterOn(recording).viewer()).rejects.toMatchObject({ problem: "auth" })
  })

  it("lists open pull requests as review targets", async () => {
    const recording = respondTo([["/pull-requests", page([pullRequest(3, "mira", { draft: true })])]])

    const [target] = await adapterOn(recording).listTargets({ limit: 10 })

    expect(target).toStrictEqual({
      ref: { kind: "pr", number: 3 },
      title: "Pull request 3",
      author: "mira",
      url: "https://bitbucket.acme.test/bitbucket/projects/PROJ/repos/ledger/pull-requests/3",
      updatedAt: "2026-10-01T09:00:00.000Z",
      isDraft: true,
      headBranch: "feature/3",
      baseRef: "main",
      baseSha: "basecommit",
      reason: "review-requested",
    })
    const request = requestedUrls(recording)[0]
    expect(request.pathname).toBe("/bitbucket/rest/api/1.0/projects/PROJ/repos/ledger/pull-requests")
    expect(request.searchParams.get("state")).toBe("OPEN")
  })

  it("answers null for a pull request that is no longer open", async () => {
    const recording = respondTo([["/pull-requests/4", pullRequest(4, "mira", { state: "MERGED" })]])

    await expect(adapterOn(recording).target({ kind: "pr", number: 4 })).resolves.toBeNull()
  })

  it("names the author and each reviewer's state", async () => {
    const recording = respondTo([
      ["/pull-requests/5", pullRequest(5, "mira", { reviewers: [participant("teo", "APPROVED"), participant("lena", "NEEDS_WORK"), participant("dev")] })],
    ])

    const summary = await adapterOn(recording).reviewers({ kind: "pr", number: 5 })

    expect(summary.author.login).toBe("mira")
    expect(summary.reviewers.map((reviewer) => [reviewer.login, reviewer.state])).toStrictEqual([
      ["teo", "approved"],
      ["lena", "changes-requested"],
      ["dev", "pending"],
    ])
  })

  it("reads the head commit of a pull request", async () => {
    const recording = respondTo([["/pull-requests/6", pullRequest(6, "mira")]])

    await expect(adapterOn(recording).headSha({ kind: "pr", number: 6 })).resolves.toBe("head6")
  })

  it("links into the pull request's diff view", () => {
    expect(adapterOn(respondTo([])).permalink({ kind: "pr", number: 7 }, "src/a.ts")).toBe(
      "https://bitbucket.acme.test/bitbucket/projects/PROJ/repos/ledger/pull-requests/7/diff#src/a.ts",
    )
  })

  it("refuses a branch row for the pull request operations", async () => {
    await expect(adapterOn(respondTo([])).reviewers({ kind: "branch", name: "topic" })).rejects.toBeInstanceOf(GitAdapterError)
  })

  it("takes the diff of a pull request between its commits in the local checkout", async () => {
    const root = await repositoryWithBranch("flightplan-data-center-adapter-")
    const { execFile } = await import("node:child_process")
    const { promisify } = await import("node:util")
    const run = promisify(execFile)
    const base = (await run("git", ["rev-parse", "main"], { cwd: root })).stdout.trim()
    const head = (await run("git", ["rev-parse", "topic"], { cwd: root })).stdout.trim()
    const recording = respondTo([
      ["/pull-requests/8", pullRequest(8, "mira", { fromRef: { latestCommit: head }, toRef: { latestCommit: base } })],
    ])

    await expect(adapterOn(recording, { root }).diff({ kind: "pr", number: 8 })).resolves.toContain("+b")
  })

  it("says so when a commit of the pull request is not in the local checkout", async () => {
    const root = await repositoryWithBranch("flightplan-data-center-adapter-")
    const recording = respondTo([["/pull-requests/9", pullRequest(9, "mira")]])

    await expect(adapterOn(recording, { root }).diff({ kind: "pr", number: 9 })).rejects.toMatchObject({ problem: "no-repo" })
  })
})

describe("BitbucketDataCenterAdapter pull request history", () => {
  const activities = page([
    { action: "COMMENTED", commentAction: "ADDED", createdDate: Date.parse("2026-10-01T10:00:00Z"), user: user("dev", "Dev") },
    { action: "COMMENTED", commentAction: "EDITED", createdDate: Date.parse("2026-10-01T10:30:00Z"), user: user("dev", "Dev") },
    { action: "APPROVED", createdDate: Date.parse("2026-10-01T11:00:00Z"), user: user("teo", "Teo") },
    { action: "RESCOPED", createdDate: Date.parse("2026-10-01T12:00:00Z"), user: user("mira", "Mira") },
    { action: "OPENED", createdDate: Date.parse("2026-10-01T08:00:00Z"), user: user("mira", "Mira") },
  ])
  const commits = page([{ committerTimestamp: Date.parse("2026-10-01T07:00:00Z") }, { authorTimestamp: Date.parse("2026-10-01T06:00:00Z") }, {}])

  it("asks for the pull requests of each author in every state", async () => {
    const recording = respondTo([["/pull-requests", page([])]])

    await adapterOn(recording).listPullRequests({ authors: ["dev", "@Mira", "DEV"], limit: 15 })

    const listings = requestedUrls(recording)
    expect(listings.map((url) => url.searchParams.get("username.1"))).toStrictEqual(["dev", "mira"])
    expect(Object.fromEntries(listings[0].searchParams)).toMatchObject({ "state": "ALL", "order": "NEWEST", "role.1": "AUTHOR", "start": "0" })
  })

  it("maps an open pull request with its activity and commits", async () => {
    const recording = respondTo([
      ["/pull-requests/3/activities", activities],
      ["/pull-requests/3/commits", commits],
      ["/pull-requests?", page([pullRequest(3, "mira")])],
    ])

    await expect(adapterOn(recording).listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toStrictEqual([
      {
        number: 3,
        title: "Pull request 3",
        headBranch: "feature/3",
        state: "open",
        isDraft: false,
        author: { login: "mira", name: "MIRA", avatarUrl: "https://bitbucket.acme.test/bitbucket/users/mira/avatar.png?s=64" },
        createdAt: "2026-10-01T08:00:00.000Z",
        updatedAt: "2026-10-01T09:00:00.000Z",
        requestedReviewers: ["teo"],
        discussion: [
          { login: "dev", at: "2026-10-01T10:00:00.000Z" },
          { login: "teo", at: "2026-10-01T11:00:00.000Z" },
        ],
        commitDates: ["2026-10-01T07:00:00.000Z", "2026-10-01T06:00:00.000Z"],
      },
    ])
  })

  it.each([
    ["MERGED", "merged"],
    ["DECLINED", "closed"],
  ] as const)("reads the state %s without reading the activity", async (state, expected) => {
    const recording = respondTo([["/pull-requests?", page([pullRequest(4, "mira", { state })])]])

    await expect(adapterOn(recording).listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toMatchObject([
      { state: expected, discussion: [], commitDates: [] },
    ])
    expect(requestedUrls(recording).some((url) => url.pathname.endsWith("/activities"))).toBe(false)
  })

  it("reads a draft without reading the activity", async () => {
    const recording = respondTo([["/pull-requests?", page([pullRequest(5, "mira", { draft: true })])]])

    await expect(adapterOn(recording).listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toMatchObject([{ isDraft: true }])
    expect(requestedUrls(recording).some((url) => url.pathname.endsWith("/activities"))).toBe(false)
  })

  it("keeps only the author's pull requests when the server ignores the author filter", async () => {
    const recording = respondTo([
      ["/pull-requests?", page([pullRequest(6, "stranger", { state: "MERGED" }), pullRequest(7, "mira", { state: "MERGED" })])],
    ])

    const histories = await adapterOn(recording).listPullRequests({ authors: ["mira"], limit: 15 })

    expect(histories.map((history) => history.number)).toStrictEqual([7])
  })

  it("reads the next page until the limit is reached", async () => {
    const recording = respondTo([
      [
        "/pull-requests?",
        (url) => url.searchParams.get("start") === "0"
          ? page([pullRequest(8, "mira", { state: "MERGED" })], { isLastPage: false, nextPageStart: 100 })
          : page([pullRequest(9, "mira", { state: "MERGED" }), pullRequest(10, "mira", { state: "MERGED" })]),
      ],
    ])

    const histories = await adapterOn(recording).listPullRequests({ authors: ["mira"], limit: 2 })

    expect(histories.map((history) => history.number)).toStrictEqual([8, 9])
    expect(requestedUrls(recording).map((url) => url.searchParams.get("start"))).toStrictEqual(["0", "100"])
  })

  it("stops after a few pages when the server never says it is done", async () => {
    const recording = respondTo([
      ["/pull-requests?", page([pullRequest(11, "stranger", { state: "MERGED" })], { isLastPage: false, nextPageStart: 1 })],
    ])

    await expect(adapterOn(recording).listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toStrictEqual([])
    expect(requestedUrls(recording)).toHaveLength(5)
  })

  it("lists a pull request found under several authors once", async () => {
    const recording = respondTo([["/pull-requests?", page([pullRequest(12, "mira", { state: "MERGED" })])]])

    await expect(adapterOn(recording).listPullRequests({ authors: ["mira", "dev"], limit: 15 })).resolves.toHaveLength(1)
  })

  it("reports an unreadable answer as a network problem", async () => {
    const recording = respondTo([["/pull-requests?", { values: [{ id: "x" }] }]])

    await expect(adapterOn(recording).listPullRequests({ authors: ["mira"], limit: 15 })).rejects.toMatchObject({ problem: "network" })
  })
})

describe("BitbucketDataCenterAdapter people search", () => {
  it("offers the matching users, then the recent pull request authors that match", async () => {
    const recording = respondTo([
      ["/rest/api/1.0/users", page([user("mira", "Mira Sandoval")])],
      ["/pull-requests", page([pullRequest(1, "marco"), pullRequest(2, "lena"), pullRequest(3, "mira")])],
    ])

    await expect(adapterOn(recording).searchPeople("m")).resolves.toStrictEqual([
      { login: "mira", name: "Mira Sandoval", avatarUrl: "https://bitbucket.acme.test/bitbucket/users/mira/avatar.png?s=64" },
      { login: "marco", name: "MARCO", avatarUrl: "https://bitbucket.acme.test/bitbucket/users/marco/avatar.png?s=64" },
    ])
    const userSearch = requestedUrls(recording).find((url) => url.pathname.endsWith("/rest/api/1.0/users"))
    expect(Object.fromEntries(userSearch?.searchParams ?? [])).toMatchObject({ filter: "m", limit: "20" })
  })
})
