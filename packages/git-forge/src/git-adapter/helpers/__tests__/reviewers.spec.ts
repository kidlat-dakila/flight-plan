import * as assert from "node:assert"
import { afterEach, vi } from "vitest"
import { BitbucketAdapter } from "@/git-adapter/bitbucket-adapter"
import { GithubTokenAdapter } from "@/git-adapter/github-token-adapter"
import { GitlabAdapter } from "@/git-adapter/gitlab-adapter"
import { githubAvatar, githubReviewState } from "@/git-adapter/helpers/github-shared"
import { GitAdapterError, mergeReviewers, type Fetcher, type GitAdapter } from "@/git-adapter/types"
import { stubGlobalFetch } from "./stub-global-fetch"

function stub(routes: Record<string, unknown>): Fetcher {
  return async (input) => {
    const key = Object.keys(routes).find((route) => input.includes(route))
    if (key === undefined) {
      return Promise.resolve(new Response("not found", { status: 404 }))
    }
    return Promise.resolve(
      new Response(JSON.stringify(routes[key]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )
  }
}

suite("merging reviewers", () => {
  it("one entry per person, with the last state winning", () => {
    const merged = mergeReviewers([
      { login: "ada", avatarUrl: "a", state: "changes-requested" },
      { login: "ada", avatarUrl: "a", state: "approved" },
    ])
    assert.strictEqual(merged.length, 1)
    assert.strictEqual(merged[0]?.state, "approved")
  })

  it("a re-request after an approval returns them to pending", () => {
    const merged = mergeReviewers([
      { login: "ada", avatarUrl: "a", state: "approved" },
      { login: "ada", avatarUrl: "a", state: "pending" },
    ])
    assert.strictEqual(merged[0]?.state, "pending")
  })

  it("keeps a picture and a name that a later bare row does not repeat", () => {
    const merged = mergeReviewers([
      { login: "ada", name: "Ada L", avatarUrl: "https://pic", state: "commented" },
      { login: "ada", avatarUrl: "", state: "pending" },
    ])
    assert.strictEqual(merged[0]?.avatarUrl, "https://pic")
    assert.strictEqual(merged[0]?.name, "Ada L")
  })

  it("matches a handle case-insensitively but keeps the host's order", () => {
    const merged = mergeReviewers([
      { login: "zoe", avatarUrl: "", state: "pending" },
      { login: "Ada", avatarUrl: "", state: "approved" },
      { login: "ada", avatarUrl: "", state: "commented" },
    ])
    assert.deepStrictEqual(
      merged.map((one) => one.login),
      ["zoe", "ada"],
    )
  })

  it("drops a row with no handle rather than drawing a faceless chip", () => {
    assert.strictEqual(mergeReviewers([{ login: "", avatarUrl: "", state: "pending" }]).length, 0)
  })
})

suite("GitHub's review states", () => {
  it("the three it names map across, and everything else is pending", () => {
    assert.strictEqual(githubReviewState("APPROVED"), "approved")
    assert.strictEqual(githubReviewState("CHANGES_REQUESTED"), "changes-requested")
    assert.strictEqual(githubReviewState("COMMENTED"), "commented")
  })

  it("a dismissed review means they are expected to look again", () => {
    assert.strictEqual(githubReviewState("DISMISSED"), "pending")
    assert.strictEqual(githubReviewState("PENDING"), "pending")
    assert.strictEqual(githubReviewState("SOMETHING_NEW"), "pending")
  })

  it("an avatar is derivable from a handle, which is all `gh` returns", () => {
    assert.strictEqual(
      githubAvatar("ada", 48),
      "https://github.com/ada.png?size=48",
    )
    assert.strictEqual(githubAvatar("  "), "")
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

suite("GitHub over a token: reviewers", () => {
  const gitAdapter = (routes: Record<string, unknown>): GitAdapter => {
    stubGlobalFetch(routes)
    return new GithubTokenAdapter({
      repo: "acme/storefront",
      token: "t",
      baseUrl: "",
    })
  }

  it("the latest review per person, with requests applied after", async () => {
    const summary = await gitAdapter({
      "/pulls/7/reviews": [
        { user: { login: "ada", avatar_url: "https://a.png" }, state: "CHANGES_REQUESTED" },
        { user: { login: "ada", avatar_url: "https://a.png" }, state: "APPROVED" },
        { user: { login: "bo", avatar_url: "https://b.png" }, state: "COMMENTED" },
      ],
      "/pulls/7/requested_reviewers": {
        users: [{ login: "cy", avatar_url: "https://c.png" }],
      },
      "/pulls/7": { user: { login: "dee", avatar_url: "https://d.png" } },
    }).reviewers({ kind: "pr", number: 7 })

    assert.strictEqual(summary.author.login, "dee")
    assert.deepStrictEqual(
      summary.reviewers.map((one) => [one.login, one.state]),
      [
        ["ada", "approved"],
        ["bo", "commented"],
        ["cy", "pending"],
      ],
    )
  })

  it("a branch is refused rather than read as pull request zero", async () => {
    await assert.rejects(
      async () => gitAdapter({}).reviewers({ kind: "branch", name: "stock-check" }),
      (cause: unknown) => cause instanceof GitAdapterError,
    )
  })
})

suite("GitLab: reviewers", () => {
  const gitAdapter = (routes: Record<string, unknown>): GitAdapter => {
    stubGlobalFetch(routes)
    return new GitlabAdapter({
      repo: "group/app",
      token: "t",
      baseUrl: "https://gitlab.com",
    })
  }

  it("an approver is approved and every other reviewer is pending", async () => {
    const summary = await gitAdapter({
      "/merge_requests/4/approvals": {
        approved_by: [{ user: { username: "ada", avatar_url: "https://a.png" } }],
      },
      "/merge_requests/4": {
        iid: 4,
        title: "t",
        author: { username: "dee", avatar_url: "https://d.png" },
        reviewers: [
          { username: "ada", avatar_url: "https://a.png" },
          { username: "bo", avatar_url: "https://b.png" },
        ],
        web_url: "",
        updated_at: "",
      },
    }).reviewers({ kind: "pr", number: 4 })

    assert.deepStrictEqual(
      summary.reviewers.map((one) => [one.login, one.state]),
      [
        ["ada", "approved"],
        ["bo", "pending"],
      ],
    )
  })

  it("somebody who approved without being asked is still shown", async () => {
    const summary = await gitAdapter({
      "/merge_requests/4/approvals": {
        approved_by: [{ user: { username: "zoe", avatar_url: "" } }],
      },
      "/merge_requests/4": {
        iid: 4,
        title: "t",
        author: { username: "dee" },
        reviewers: [],
        web_url: "",
        updated_at: "",
      },
    }).reviewers({ kind: "pr", number: 4 })

    assert.deepStrictEqual(
      summary.reviewers.map((one) => [one.login, one.state]),
      [["zoe", "approved"]],
    )
  })

  it("an instance with no approvals feature costs the marks, not the header", async () => {
    const summary = await gitAdapter({
      "/merge_requests/4": {
        iid: 4,
        title: "t",
        author: { username: "dee" },
        reviewers: [{ username: "ada" }],
        web_url: "",
        updated_at: "",
      },
    }).reviewers({ kind: "pr", number: 4 })

    assert.deepStrictEqual(
      summary.reviewers.map((one) => [one.login, one.state]),
      [["ada", "pending"]],
    )
  })

  it("a null avatar_url becomes empty rather than the string null", async () => {
    const summary = await gitAdapter({
      "/merge_requests/4": {
        iid: 4,
        title: "t",
        author: { username: "dee", avatar_url: null },
        reviewers: [],
        web_url: "",
        updated_at: "",
      },
    }).reviewers({ kind: "pr", number: 4 })
    assert.strictEqual(summary.author.avatarUrl, "")
  })
})

suite("Bitbucket: reviewers", () => {
  const gitAdapter = (routes: Record<string, unknown>): GitAdapter =>
    new BitbucketAdapter({
      repo: "acme/storefront",
      username: "someone",
      token: "s3cret",
      fetcher: stub(routes),
    })

  it("the state decides, not the approved boolean", async () => {
    const summary = await gitAdapter({
      "/pullrequests/9": {
        id: 9,
        title: "t",
        author: { nickname: "dee" },
        participants: [
          { user: { nickname: "ada" }, role: "REVIEWER", approved: false, state: "changes_requested" },
          { user: { nickname: "bo" }, role: "REVIEWER", approved: true, state: "approved" },
          { user: { nickname: "cy" }, role: "REVIEWER", approved: false, state: null },
        ],
      },
    }).reviewers({ kind: "pr", number: 9 })

    assert.deepStrictEqual(
      summary.reviewers.map((one) => [one.login, one.state]),
      [
        ["ada", "changes-requested"],
        ["bo", "approved"],
        ["cy", "pending"],
      ],
    )
  })

  it("an onlooker is dropped, unless they actually did something", async () => {
    const summary = await gitAdapter({
      "/pullrequests/9": {
        id: 9,
        title: "t",
        author: { nickname: "dee" },
        participants: [
          { user: { nickname: "idle" }, role: "PARTICIPANT", state: null },
          { user: { nickname: "acted" }, role: "PARTICIPANT", state: "approved" },
        ],
      },
    }).reviewers({ kind: "pr", number: 9 })

    assert.deepStrictEqual(
      summary.reviewers.map((one) => one.login),
      ["acted"],
    )
  })
})
