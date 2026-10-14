import { describe, expect, it } from "vitest"
import { BitbucketAdapter } from "@/git-adapter/bitbucket-adapter"
import { BitbucketDataCenterAdapter } from "@/git-adapter/bitbucket-data-center-adapter"
import { refusal, stubForge, type ForgeCall, type StubbedForge } from "./stubbed-forge"

const REF = { kind: "pr", number: 7 } as const
const PATH = "src/price.ts"

describe("BitbucketAdapter review", () => {
  const route = "https://api.bitbucket.org/2.0/repositories/acme/shop/pullrequests/7"

  const account = (nickname: string) => ({
    uuid: `{${nickname}}`,
    nickname,
    display_name: nickname.toUpperCase(),
    links: { avatar: { href: `https://avatars.test/${nickname}.png` } },
  })

  const pullRequestBody = {
    id: 7,
    title: "Count held units",
    state: "OPEN",
    author: account("mira"),
    links: { html: { href: "https://bitbucket.org/acme/shop/pull-requests/7" } },
    reviewers: [account("teo")],
    participants: [
      { user: account("jonas"), role: "REVIEWER", state: "approved", participated_on: "2026-10-01T11:00:00Z" },
      { user: account("amara"), role: "REVIEWER", state: "changes_requested", participated_on: "2026-10-01T11:10:00Z" },
      { user: account("teo"), role: "REVIEWER", state: null, participated_on: null },
    ],
  }

  const comment = (id: number, nickname: string, raw: string, extra: object = {}) => ({
    id,
    content: { raw },
    user: account(nickname),
    created_on: "2026-10-01T10:00:00Z",
    links: { html: { href: `https://bitbucket.org/acme/shop/pull-requests/7#comment-${String(id)}` } },
    ...extra,
  })

  const commentPage = {
    values: [
      comment(1, "teo", "Later."),
      comment(2, "amara", "Why drop it?", { inline: { path: PATH, from: 4, to: null }, resolution: { type: "comment_resolution" } }),
      comment(3, "mira", "It moved.", { parent: { id: 2 } }),
      comment(4, "jonas", "Clamp these.", { inline: { path: PATH, from: null, to: 6, start_to: 4 } }),
      comment(5, "jonas", "Old.", { inline: { path: PATH, from: null, to: 9, outdated: true } }),
    ],
  }

  const answer = (call: ForgeCall): unknown => {
    if (call.method !== "GET") return {}
    if (call.url.includes("/comments")) return commentPage
    if (call.url.includes("/members")) return { values: [{ user: account("lena") }, { user: account("teo") }] }
    return pullRequestBody
  }

  const adapterOn = (respond: (call: ForgeCall) => unknown = answer): { adapter: BitbucketAdapter, forge: StubbedForge } => {
    const forge = stubForge(respond)
    return { adapter: new BitbucketAdapter({ username: "dev", token: "s3cret", repo: "acme/shop", fetcher: forge.fetcher }), forge }
  }

  it("reads the comments, the threads with their side and lines, and who approved or asked for changes", async () => {
    const { adapter } = adapterOn()

    await expect(adapter.discussion(REF)).resolves.toMatchObject({
      comments: [{ id: "1", author: { login: "teo", avatarUrl: "https://avatars.test/teo.png" }, body: "Later." }],
      threads: [
        {
          id: "2",
          path: PATH,
          position: { path: PATH, side: "old", startLine: 4, endLine: 4 },
          isResolved: true,
          isOutdated: false,
          comments: [{ id: "2" }, { id: "3" }],
        },
        { id: "4", position: { path: PATH, side: "new", startLine: 4, endLine: 6 }, isResolved: false },
        { id: "5", position: null, isOutdated: true },
      ],
      reviews: [
        { id: "approve-jonas", verdict: "approve", submittedAt: "2026-10-01T11:00:00Z" },
        { id: "request-changes-amara", verdict: "request-changes" },
      ],
    })
  })

  it("posts each line comment, then the summary, then the verdict", async () => {
    const { adapter, forge } = adapterOn()

    await adapter.submitReview(REF, {
      verdict: "request-changes",
      body: "Two things.",
      commitSha: "abc1234",
      comments: [
        { position: { path: PATH, side: "old", startLine: 4, endLine: 4 }, body: "Why drop it?" },
        { position: { path: PATH, side: "new", startLine: 4, endLine: 6 }, body: "Clamp these." },
      ],
    })

    expect(forge.writes()).toStrictEqual([
      { method: "POST", url: `${route}/comments`, body: { content: { raw: "Why drop it?" }, inline: { path: PATH, from: 4 } } },
      { method: "POST", url: `${route}/comments`, body: { content: { raw: "Clamp these." }, inline: { path: PATH, to: 6, start_to: 4 } } },
      { method: "POST", url: `${route}/comments`, body: { content: { raw: "Two things." } } },
      { method: "POST", url: `${route}/request-changes`, body: null },
    ])
  })

  it("sends a comment review with no verdict call, and an approval to its own address", async () => {
    const commenting = adapterOn()
    const approving = adapterOn()

    await commenting.adapter.submitReview(REF, { verdict: "comment", body: "Thanks.", commitSha: "abc1234", comments: [] })
    await approving.adapter.submitReview(REF, { verdict: "approve", body: "", commitSha: "abc1234", comments: [] })

    expect(commenting.forge.writes().map((call) => call.url)).toStrictEqual([`${route}/comments`])
    expect(approving.forge.writes().map((call) => call.url)).toStrictEqual([`${route}/approve`])
  })

  it("replies to a thread, resolves it and reopens it", async () => {
    const { adapter, forge } = adapterOn()

    await adapter.replyToThread(REF, "2", "Done.")
    await adapter.resolveThread(REF, "2")
    await adapter.reopenThread(REF, "2")

    expect(forge.writes()).toStrictEqual([
      { method: "POST", url: `${route}/comments`, body: { content: { raw: "Done." }, parent: { id: 2 } } },
      { method: "POST", url: `${route}/comments/2/resolve`, body: null },
      { method: "DELETE", url: `${route}/comments/2/resolve`, body: null },
    ])
  })

  it("adds a workspace member to the reviewers, and removes one", async () => {
    const { adapter, forge } = adapterOn()

    await adapter.requestReviewers(REF, ["lena"])
    await adapter.removeReviewRequests(REF, ["teo"])

    expect(forge.writes()).toStrictEqual([
      { method: "PUT", url: route, body: { title: "Count held units", reviewers: [{ uuid: "{teo}" }, { uuid: "{lena}" }] } },
      { method: "PUT", url: route, body: { title: "Count held units", reviewers: [] } },
    ])
  })

  it("lists the workspace members who match, and reports a refusal", async () => {
    const { adapter } = adapterOn()
    const refusing = adapterOn((call) => (call.method === "GET" ? answer(call) : refusal(403, { error: { message: "Forbidden" } })))

    await expect(adapter.searchReviewers(REF, "le")).resolves.toMatchObject([{ login: "lena" }])
    await expect(refusing.adapter.addComment(REF, "Thanks.")).rejects.toMatchObject({ problem: "auth" })
    await expect(adapter.requestReviewers(REF, ["nobody"])).rejects.toMatchObject({ message: "Bitbucket has no workspace member named nobody." })
  })
})

describe("BitbucketDataCenterAdapter review", () => {
  const webRoot = "https://bitbucket.acme.test"
  const route = `${webRoot}/rest/api/1.0/projects/PROJ/repos/ledger/pull-requests/7`

  const user = (slug: string) => ({ name: slug.toUpperCase(), slug, displayName: `${slug} name`, avatarUrl: `/users/${slug}/avatar.png` })

  const pullRequestBody = {
    id: 7,
    version: 3,
    title: "Count held units",
    state: "OPEN",
    author: { user: user("mira"), role: "AUTHOR" },
    reviewers: [{ user: user("teo"), role: "REVIEWER", status: "UNAPPROVED" }],
  }

  const commented = (comment: object, commentAnchor?: object) => ({
    id: 100,
    action: "COMMENTED",
    commentAction: "ADDED",
    createdDate: Date.parse("2026-10-01T10:00:00Z"),
    user: user("amara"),
    comment,
    ...(commentAnchor === undefined ? {} : { commentAnchor }),
  })

  const activityPage = {
    values: [
      commented({ id: 1, text: "Later.", author: user("teo"), createdDate: Date.parse("2026-10-01T10:00:00Z") }),
      commented(
        {
          id: 2,
          version: 4,
          text: "Why drop it?",
          author: user("amara"),
          createdDate: Date.parse("2026-10-01T10:05:00Z"),
          threadResolved: true,
          comments: [{ id: 3, text: "It moved.", author: user("mira"), createdDate: Date.parse("2026-10-01T10:06:00Z") }],
        },
        { path: PATH, line: 4, lineType: "REMOVED", fileType: "FROM" },
      ),
      commented(
        { id: 4, text: "Clamp these.", author: user("jonas"), createdDate: Date.parse("2026-10-01T10:07:00Z") },
        { path: PATH, line: 6, lineType: "ADDED", fileType: "TO", multilineMarker: { startLine: 4 } },
      ),
      { id: 200, action: "APPROVED", createdDate: Date.parse("2026-10-01T11:00:00Z"), user: user("jonas") },
      { id: 201, action: "REVIEWED", createdDate: Date.parse("2026-10-01T11:10:00Z"), user: user("amara") },
      { id: 202, action: "RESCOPED", createdDate: Date.parse("2026-10-01T11:20:00Z"), user: user("mira") },
    ],
  }

  const answer = (call: ForgeCall): unknown => {
    if (call.method !== "GET") return {}
    if (call.url.includes("/activities")) return activityPage
    if (call.url.includes("/comments/2")) return { id: 2, version: 4, text: "Why drop it?" }
    if (call.url.includes("/application-properties")) return new Response("{}", { status: 200, headers: { "x-ausername": "dev" } })
    if (call.url.includes("/users/dev")) return user("dev")
    if (call.url.includes("/users?")) return { values: [user("lena"), user("lenard")] }
    return pullRequestBody
  }

  const adapterOn = (): { adapter: BitbucketDataCenterAdapter, forge: StubbedForge } => {
    const forge = stubForge(answer)
    const adapter = new BitbucketDataCenterAdapter({
      repo: "scm/PROJ/ledger",
      token: "s3cret",
      baseUrl: webRoot,
      fetcher: forge.fetcher,
    })
    return { adapter, forge }
  }

  it("reads the comments with their replies, the threads on the diff, and the approvals and needs-work marks", async () => {
    const { adapter } = adapterOn()

    await expect(adapter.discussion(REF)).resolves.toMatchObject({
      comments: [{ id: "1", author: { login: "teo", name: "teo name" }, body: "Later.", createdAt: "2026-10-01T10:00:00.000Z" }],
      threads: [
        {
          id: "2",
          path: PATH,
          position: { path: PATH, side: "old", startLine: 4, endLine: 4 },
          isResolved: true,
          comments: [{ id: "2" }, { id: "3", body: "It moved." }],
        },
        { id: "4", position: { path: PATH, side: "new", startLine: 4, endLine: 6 }, isResolved: false },
      ],
      reviews: [
        { id: "200", author: { login: "jonas" }, verdict: "approve" },
        { id: "201", author: { login: "amara" }, verdict: "request-changes" },
      ],
    })
  })

  it("posts the summary and marks the viewer's verdict", async () => {
    const approving = adapterOn()
    const objecting = adapterOn()

    await approving.adapter.submitReview(REF, { verdict: "approve", body: "Good.", commitSha: "abc1234", comments: [] })
    await objecting.adapter.submitReview(REF, { verdict: "request-changes", body: "", commitSha: "abc1234", comments: [] })

    expect(approving.forge.writes()).toStrictEqual([
      { method: "POST", url: `${route}/comments`, body: { text: "Good." } },
      { method: "PUT", url: `${route}/participants/dev`, body: { status: "APPROVED" } },
    ])
    expect(objecting.forge.writes()).toStrictEqual([
      { method: "PUT", url: `${route}/participants/dev`, body: { status: "NEEDS_WORK" } },
    ])
  })

  it("replies to a thread, and resolves and reopens it at the comment's version", async () => {
    const { adapter, forge } = adapterOn()

    await adapter.replyToThread(REF, "2", "Done.")
    await adapter.resolveThread(REF, "2")
    await adapter.reopenThread(REF, "2")

    expect(forge.writes()).toStrictEqual([
      { method: "POST", url: `${route}/comments`, body: { text: "Done.", parent: { id: 2 } } },
      { method: "PUT", url: `${route}/comments/2`, body: { version: 4, threadResolved: true } },
      { method: "PUT", url: `${route}/comments/2`, body: { version: 4, threadResolved: false } },
    ])
  })

  it("adds a user to the reviewers at the pull request's version, and removes one", async () => {
    const { adapter, forge } = adapterOn()

    await adapter.requestReviewers(REF, ["lena"])
    await adapter.removeReviewRequests(REF, ["teo"])

    expect(forge.writes()).toStrictEqual([
      {
        method: "PUT",
        url: route,
        body: { id: 7, version: 3, title: "Count held units", reviewers: [{ user: { name: "TEO" } }, { user: { name: "LENA" } }] },
      },
      { method: "PUT", url: route, body: { id: 7, version: 3, title: "Count held units", reviewers: [] } },
    ])
  })

  it("lists the users who can be asked, and offers every verdict", async () => {
    const { adapter } = adapterOn()

    expect(adapter.supports("reviewRequests")).toBe(true)
    expect(adapter.supports("repeatedReviewRequests")).toBe(false)

    await expect(adapter.searchReviewers(REF, "len")).resolves.toMatchObject([{ login: "lena" }, { login: "lenard" }])
    expect(adapter.reviewVerdicts()).toStrictEqual(["comment", "approve", "request-changes"])
  })
})
