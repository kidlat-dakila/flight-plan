import { afterEach, describe, expect, it, vi } from "vitest"
import { GithubTokenAdapter } from "@/git-adapter/github-token-adapter"
import { GitAdapterError, type Capability } from "@/git-adapter/types"
import { refusal, stubForge, type ForgeCall, type StubbedForge } from "./stubbed-forge"

const REF = { kind: "pr", number: 7 } as const
const PULL_ROUTE = "https://api.github.com/repos/acme/shop/pulls/7"
const REVIEW_CAPABILITIES: readonly Capability[] = ["discussion", "review", "replies", "resolution", "reviewRequests"]

afterEach(() => {
  vi.unstubAllGlobals()
})

const actor = (login: string, name: string | null = null) => ({ login, avatarUrl: `https://avatars.test/${login}.png`, name })

const comment = (id: string, login: string, body: string) => ({
  id,
  body,
  createdAt: "2026-10-01T10:00:00Z",
  url: `https://github.com/acme/shop/pull/7#${id}`,
  author: actor(login),
})

const DISCUSSION = {
  data: {
    repository: {
      pullRequest: {
        comments: { nodes: [comment("IC_1", "grace", "Later."), null] },
        reviews: {
          nodes: [
            { id: "R_1", state: "APPROVED", body: "Good.", submittedAt: "2026-10-01T11:00:00Z", url: "https://github.com/r1", author: actor("ada", "Ada Lovelace") },
            { id: "R_2", state: "CHANGES_REQUESTED", body: "No.", submittedAt: "2026-10-01T11:10:00Z", url: "https://github.com/r2", author: null },
            { id: "R_3", state: "PENDING", body: "Draft.", submittedAt: null, url: "https://github.com/r3", author: actor("ada") },
          ],
        },
        reviewThreads: {
          nodes: [
            { id: "T_1", isResolved: true, isOutdated: false, path: "src/price.ts", line: 6, startLine: 4, diffSide: "LEFT", comments: { nodes: [comment("C_1", "ada", "Why?")] } },
            { id: "T_2", isResolved: false, isOutdated: false, path: "src/price.ts", line: 9, startLine: null, diffSide: "RIGHT", comments: { nodes: [] } },
            { id: "T_3", isResolved: false, isOutdated: true, path: "src/cart.ts", line: null, startLine: null, diffSide: "RIGHT", comments: { nodes: [] } },
          ],
        },
      },
    },
  },
}

const adapterOn = (answer: (call: ForgeCall) => unknown): { adapter: GithubTokenAdapter, forge: StubbedForge } => {
  const forge = stubForge(answer)
  vi.stubGlobal("fetch", forge.fetcher)
  return { adapter: new GithubTokenAdapter({ token: "t", repo: "acme/shop" }), forge }
}

describe("GithubAdapter discussion", () => {
  it("reads the comments, the submitted reviews and the threads with their side and lines", async () => {
    const { adapter } = adapterOn(() => DISCUSSION)

    await expect(adapter.discussion(REF)).resolves.toStrictEqual({
      comments: [
        {
          id: "IC_1",
          author: { login: "grace", name: undefined, avatarUrl: "https://avatars.test/grace.png" },
          body: "Later.",
          createdAt: "2026-10-01T10:00:00Z",
          url: "https://github.com/acme/shop/pull/7#IC_1",
        },
      ],
      threads: [
        {
          id: "T_1",
          path: "src/price.ts",
          position: { path: "src/price.ts", side: "old", startLine: 4, endLine: 6 },
          isResolved: true,
          isOutdated: false,
          comments: [expect.objectContaining({ id: "C_1", body: "Why?" })],
        },
        {
          id: "T_2",
          path: "src/price.ts",
          position: { path: "src/price.ts", side: "new", startLine: 9, endLine: 9 },
          isResolved: false,
          isOutdated: false,
          comments: [],
        },
        { id: "T_3", path: "src/cart.ts", position: null, isResolved: false, isOutdated: true, comments: [] },
      ],
      reviews: [
        {
          id: "R_1",
          author: { login: "ada", name: "Ada Lovelace", avatarUrl: "https://avatars.test/ada.png" },
          verdict: "approve",
          body: "Good.",
          submittedAt: "2026-10-01T11:00:00Z",
          url: "https://github.com/r1",
        },
        expect.objectContaining({ id: "R_2", verdict: "request-changes" }),
      ],
    })
  })

  it("names the author of a review whose account is gone as GitHub does", async () => {
    const { adapter } = adapterOn(() => DISCUSSION)

    expect((await adapter.discussion(REF)).reviews.map((review) => review.author.login)).toStrictEqual(["ada", "ghost"])
  })

  it("asks for the pull request by its repository and number", async () => {
    const { adapter, forge } = adapterOn(() => DISCUSSION)

    await adapter.discussion(REF)

    expect(forge.calls()).toMatchObject([{ method: "POST", url: "https://api.github.com/graphql" }])
    expect(JSON.stringify(forge.calls()[0]?.body)).toContain("repository(owner: \\\"acme\\\", name: \\\"shop\\\")")
    expect(JSON.stringify(forge.calls()[0]?.body)).toContain("pullRequest(number: 7)")
  })

  it("reports a pull request the code host does not show", async () => {
    const { adapter } = adapterOn(() => ({ data: { repository: null }, errors: [{ type: "NOT_FOUND" }] }))

    await expect(adapter.discussion(REF)).rejects.toMatchObject({ problem: "no-repo" })
  })

  it("offers every verdict and the review capabilities", () => {
    const adapter = new GithubTokenAdapter({ token: "t", repo: "acme/shop" })

    expect(adapter.reviewVerdicts()).toStrictEqual(["comment", "approve", "request-changes"])
    expect(REVIEW_CAPABILITIES.every((capability) => adapter.supports(capability))).toBe(true)
  })
})

describe("GithubAdapter review", () => {
  it("submits the verdict, the summary and the line comments in one review, against the commit", async () => {
    const { adapter, forge } = adapterOn(() => ({}))

    await adapter.submitReview(REF, {
      verdict: "request-changes",
      body: "Two things.",
      commitSha: "abc1234",
      comments: [
        { position: { path: "src/price.ts", side: "new", startLine: 9, endLine: 9 }, body: "Clamp it." },
        { position: { path: "src/price.ts", side: "old", startLine: 4, endLine: 6 }, body: "Why drop these?" },
      ],
    })

    expect(forge.writes()).toStrictEqual([
      {
        method: "POST",
        url: `${PULL_ROUTE}/reviews`,
        body: {
          commit_id: "abc1234",
          body: "Two things.",
          event: "REQUEST_CHANGES",
          comments: [
            { path: "src/price.ts", body: "Clamp it.", line: 9, side: "RIGHT" },
            { path: "src/price.ts", body: "Why drop these?", line: 6, side: "LEFT", start_line: 4, start_side: "LEFT" },
          ],
        },
      },
    ])
  })

  it("passes on the code host's own reason when it refuses", async () => {
    const { adapter } = adapterOn(() =>
      refusal(422, { message: "Unprocessable Entity", errors: ["Can not approve your own pull request"] }))

    const failure = await adapter
      .submitReview(REF, { verdict: "approve", body: "", commitSha: "abc1234", comments: [] })
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(GitAdapterError)
    expect(failure).toMatchObject({ message: "Can not approve your own pull request" })
  })

  it("comments on the pull request as a whole", async () => {
    const { adapter, forge } = adapterOn(() => ({}))

    await adapter.addComment(REF, "Thanks.")

    expect(forge.writes()).toStrictEqual([
      { method: "POST", url: "https://api.github.com/repos/acme/shop/issues/7/comments", body: { body: "Thanks." } },
    ])
  })

  it("replies to a thread, resolves it and reopens it", async () => {
    const { adapter, forge } = adapterOn(() => ({ data: {} }))

    await adapter.replyToThread(REF, "T_1", "It \"does\".")
    await adapter.resolveThread(REF, "T_1")
    await adapter.reopenThread(REF, "T_1")

    const mutations = forge.writes().map((call) => JSON.stringify(call.body))
    expect(mutations[0]).toContain("addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: \\\"T_1\\\"")
    expect(mutations[0]).toContain("It \\\\\\\"does\\\\\\\".")
    expect(mutations[1]).toContain("resolveReviewThread(input: { threadId: \\\"T_1\\\" })")
    expect(mutations[2]).toContain("unresolveReviewThread(input: { threadId: \\\"T_1\\\" })")
  })

  it("reports the reason a thread change is refused", async () => {
    const { adapter } = adapterOn(() => ({ errors: [{ type: "FORBIDDEN", message: "Resource not accessible by integration" }] }))

    await expect(adapter.resolveThread(REF, "T_1")).rejects.toMatchObject({
      message: "Resource not accessible by integration",
      problem: "auth",
    })
  })

  it("requests reviewers and removes a request", async () => {
    const { adapter, forge } = adapterOn(() => ({}))

    await adapter.requestReviewers(REF, ["grace"])
    await adapter.removeReviewRequests(REF, ["grace"])

    expect(forge.writes()).toStrictEqual([
      { method: "POST", url: `${PULL_ROUTE}/requested_reviewers`, body: { reviewers: ["grace"] } },
      { method: "DELETE", url: `${PULL_ROUTE}/requested_reviewers`, body: { reviewers: ["grace"] } },
    ])
  })

  it("lists the people who can be asked for a review", async () => {
    const { adapter } = adapterOn(() => ({
      data: {
        repository: {
          assignableUsers: { nodes: [{ login: "grace", name: "Grace Hopper", avatarUrl: "https://avatars.test/grace.png" }] },
          pullRequests: { nodes: [{ author: { login: "outsider", avatarUrl: "", name: null } }] },
        },
      },
    }))

    await expect(adapter.searchReviewers(REF, "gr")).resolves.toStrictEqual([
      { login: "grace", name: "Grace Hopper", avatarUrl: "https://avatars.test/grace.png" },
    ])
  })

  it("refuses a branch, which has no pull request", async () => {
    const adapter = new GithubTokenAdapter({ token: "t", repo: "acme/shop" })

    await expect(adapter.requestReviewers({ kind: "branch", name: "topic" }, ["grace"])).rejects.toMatchObject({ problem: "unsupported" })
  })
})
