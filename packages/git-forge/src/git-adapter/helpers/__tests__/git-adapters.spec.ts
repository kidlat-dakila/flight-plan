import * as assert from "node:assert"
import { afterEach, describe, vi } from "vitest"
import { BitbucketAdapter, bitbucketAnchor, isCloudUrl } from "@/git-adapter/bitbucket-adapter"
import { githubApiRoot } from "@/git-adapter/github-adapter"
import { GithubTokenAdapter } from "@/git-adapter/github-token-adapter"
import { GitlabAdapter, gitlabApiRoot, gitlabDiffAnchor } from "@/git-adapter/gitlab-adapter"
import { GitAdapterError, sameCommit, type Fetcher } from "@/git-adapter/types"
import { stubGlobalFetch } from "./stub-global-fetch"

function stub(routes: Record<string, unknown>): {
  fetcher: Fetcher
  urls: () => string[]
  headers: () => Record<string, string>[]
} {
  const fetcher = vi.fn<Fetcher>(async (input) => {
    const key = Object.keys(routes).find((route) => input.includes(route))
    if (key === undefined) {
      return await Promise.resolve(new Response("not found", { status: 404 }))
    }
    const body = routes[key]
    return await Promise.resolve(
      typeof body === "string"
        ? new Response(body, { status: 200 })
        : new Response(JSON.stringify(body), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
    )
  })
  return {
    fetcher,
    urls: () => fetcher.mock.calls.map(([input]) => input),
    headers: () => fetcher.mock.calls.map(([, init]) => Object.fromEntries(new Headers(init?.headers).entries())),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("GitHub over a token", () => {
  it("the API root is the cloud one, or Enterprise's /api/v3", () => {
    assert.strictEqual(githubApiRoot(""), "https://api.github.com")
    assert.strictEqual(
      githubApiRoot("https://ghe.example.com"),
      "https://ghe.example.com/api/v3",
    )

    assert.strictEqual(
      githubApiRoot("https://ghe.example.com/api/v3"),
      "https://ghe.example.com/api/v3",
    )
  })

  it("no review filter uses the plain list rather than search", async () => {
    const { urls } = stubGlobalFetch({ "/pulls": [], "/search/issues": { items: [] } })
    const gitAdapter = new GithubTokenAdapter({
      repo: "acme/storefront",
      token: "t",
      baseUrl: "",
    })
    await gitAdapter.listTargets({ includeMine: false })
    assert.ok(urls().some((url) => url.includes("/repos/acme/storefront/pulls")))
    assert.ok(!urls().some((url) => url.includes("/search/issues")))
  })

  it("a review filter switches to the search endpoint", async () => {
    const { urls } = stubGlobalFetch({ "/search/issues": { items: [] } })
    const gitAdapter = new GithubTokenAdapter({
      repo: "acme/storefront",
      token: "t",
      baseUrl: "",
    })
    await gitAdapter.listTargets({
      filter: { review: ["awaiting-me-or-team"], labels: [] },
      includeMine: false,
    })
    const search = urls().find((url) => url.includes("/search/issues"))
    assert.notStrictEqual(search, undefined)
    const query = decodeURIComponent(search ?? "")
    assert.ok(query.includes("repo:acme/storefront"))
    assert.ok(query.includes("is:pr"))
    assert.ok(query.includes("review-requested:@me"))
  })

  it("the diff is asked for by media type", async () => {
    const { headers } = stubGlobalFetch({ "/pulls/7": "diff --git a/x b/x\n" })
    const gitAdapter = new GithubTokenAdapter({
      repo: "acme/storefront",
      token: "t",
      baseUrl: "",
    })
    const diff = await gitAdapter.diff({ kind: "pr", number: 7 })
    assert.ok(diff.startsWith("diff --git"))
    assert.strictEqual(
      headers()[0]?.accept,
      "application/vnd.github.v3.diff",
    )
  })

  it("the token is sent in the authorization header", async () => {
    const { headers } = stubGlobalFetch({ "/labels": [] })
    const gitAdapter = new GithubTokenAdapter({
      repo: "acme/storefront",
      token: "s3cret",
      baseUrl: "",
    })
    await gitAdapter.listLabels()
    assert.strictEqual(headers()[0]?.authorization, "token s3cret")
  })

  it("a branch row is refused where only a pull request has the answer", async () => {
    const gitAdapter = new GithubTokenAdapter({
      repo: "acme/storefront",
      token: "t",
      baseUrl: "",
    })
    await assert.rejects(
      async () => gitAdapter.reviewers({ kind: "branch", name: "stock-check" }),
      (cause: unknown) =>
        cause instanceof GitAdapterError && cause.problem === "unsupported",
    )
  })
})

describe("GitLab", () => {
  it("the API root is the cloud one, or an instance's", () => {
    assert.strictEqual(gitlabApiRoot(""), "https://gitlab.com/api/v4")
    assert.strictEqual(
      gitlabApiRoot("https://gitlab.example.com"),
      "https://gitlab.example.com/api/v4",
    )
    assert.strictEqual(
      gitlabApiRoot("https://gitlab.example.com/api/v4"),
      "https://gitlab.example.com/api/v4",
    )
  })

  it("a nested project path is encoded whole, slashes included", async () => {
    const { urls } = stubGlobalFetch({ "/merge_requests": [] })
    const gitAdapter = new GitlabAdapter({
      repo: "group/subgroup/project",
      token: "t",
      baseUrl: "",
    })
    await gitAdapter.listTargets({ includeMine: false })
    assert.ok(
      urls()[0]?.includes("/projects/group%2Fsubgroup%2Fproject/merge_requests"),
      urls()[0],
    )
  })

  it("a merge request is addressed by its iid", async () => {
    const { urls } = stubGlobalFetch({
      "/merge_requests/42": { iid: 42, id: 99999, title: "t", web_url: "", updated_at: "", state: "opened", sha: "abc1234def56" },
    })
    const gitAdapter = new GitlabAdapter({
      repo: "acme/storefront",
      token: "t",
      baseUrl: "",
    })
    const row = await gitAdapter.target({ kind: "pr", number: 42 })
    assert.strictEqual(row?.ref.kind === "pr" && row.ref.number, 42)
    assert.ok(urls()[0]?.endsWith("/merge_requests/42"), urls()[0])
  })

  it("the token is sent in GitLab's own header, not as a bearer", async () => {
    const { headers } = stubGlobalFetch({ "/labels": [] })
    const gitAdapter = new GitlabAdapter({
      repo: "acme/storefront",
      token: "s3cret",
      baseUrl: "",
    })
    await gitAdapter.listLabels()
    assert.strictEqual(headers()[0]?.["private-token"], "s3cret")
    assert.strictEqual(headers()[0]?.authorization, undefined)
  })

  it("the diff comes from raw_diffs, not the deprecated changes endpoint", async () => {
    const { urls } = stubGlobalFetch({ "/raw_diffs": "diff --git a/x b/x\n" })
    const gitAdapter = new GitlabAdapter({
      repo: "acme/storefront",
      token: "t",
      baseUrl: "",
    })
    await gitAdapter.diff({ kind: "pr", number: 5 })
    assert.ok(urls()[0]?.endsWith("/merge_requests/5/raw_diffs"), urls()[0])
    assert.ok(!urls().some((url) => url.includes("/changes")))
  })

  it("a comparison maps GitLab's flags onto file statuses", async () => {
    stubGlobalFetch({
      "/repository/compare": {
        commits: [{}, {}, {}],
        diffs: [
          { new_path: "added.ts", old_path: "added.ts", new_file: true, diff: "@@ -0,0 +1 @@\n+x\n" },
          { new_path: "gone.ts", old_path: "gone.ts", deleted_file: true, diff: "@@ -1 +0,0 @@\n-x\n" },
          { new_path: "new.ts", old_path: "old.ts", renamed_file: true, diff: "" },
          { new_path: "same.ts", old_path: "same.ts", diff: "@@ -1 +1 @@\n-a\n+b\n" },
        ],
      },
    })
    const gitAdapter = new GitlabAdapter({
      repo: "acme/storefront",
      token: "t",
      baseUrl: "",
    })
    const comparison = await gitAdapter.compare("aaa", "bbb")
    assert.strictEqual(comparison.commits, 3)
    assert.deepStrictEqual(
      comparison.files.map((file) => [file.path, file.status]),
      [
        ["added.ts", "added"],
        ["gone.ts", "removed"],
        ["new.ts", "renamed"],
        ["same.ts", "modified"],
      ],
    )
    const renamed = comparison.files[2]
    assert.strictEqual(renamed.previousPath, "old.ts")

    assert.strictEqual(renamed.patch, undefined)
  })

  it("a permalink points at the file in the diff, hashed with SHA-1", () => {
    const gitAdapter = new GitlabAdapter({
      repo: "group/sub/proj",
      token: "t",
      baseUrl: "https://gitlab.example.com",
    })
    const link = gitAdapter.permalink({ kind: "pr", number: 12 }, "src/checkout/placeOrder.ts")
    assert.strictEqual(
      link,
      `https://gitlab.example.com/group/sub/proj/-/merge_requests/12/diffs#${
        gitlabDiffAnchor("src/checkout/placeOrder.ts")}`,
    )

    assert.strictEqual(gitlabDiffAnchor("x").length, 40)
  })
})

describe("Bitbucket Cloud", () => {
  const credentials = { username: "someone", token: "s3cret", baseUrl: "" }

  it("declares no labels and no review filters, because it has neither", () => {
    const gitAdapter = new BitbucketAdapter({
      repo: "acme/storefront",
      ...credentials,
      fetcher: stub({}).fetcher,
    })
    assert.ok(!gitAdapter.supports("labels"))
    assert.ok(!gitAdapter.supports("filters"))
    assert.deepStrictEqual(gitAdapter.reviewFilters(), [])
  })

  it("authenticates with basic credentials", async () => {
    const { fetcher, headers } = stub({ "/pullrequests": { values: [] } })
    const gitAdapter = new BitbucketAdapter({
      repo: "acme/storefront",
      ...credentials,
      fetcher,
    })
    await gitAdapter.listTargets({})
    assert.strictEqual(
      headers()[0]?.authorization,
      `Basic ${Buffer.from("someone:s3cret", "utf8").toString("base64")}`,
    )
  })

  it("an abbreviated head hash is returned as given and still matches", async () => {
    const full = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678"
    const { fetcher } = stub({
      "/pullrequests/3": {
        id: 3,
        title: "t",
        state: "OPEN",
        source: { commit: { hash: full.slice(0, 12) } },
      },
    })
    const gitAdapter = new BitbucketAdapter({
      repo: "acme/storefront",
      ...credentials,
      fetcher,
    })
    const hash = await gitAdapter.headSha({ kind: "pr", number: 3 })
    assert.strictEqual(hash, full.slice(0, 12))
    assert.notStrictEqual(hash, full)
    assert.ok(sameCommit(hash, full))
  })

  it("a permalink embeds the path unhashed", () => {
    const gitAdapter = new BitbucketAdapter({
      repo: "acme/storefront",
      ...credentials,
      fetcher: stub({}).fetcher,
    })
    assert.strictEqual(
      gitAdapter.permalink({ kind: "pr", number: 9 }, "src/checkout/placeOrder.ts", {
        from: 42,
        to: 44,
      }),
      "https://bitbucket.org/acme/storefront/pull-requests/9/diff"
      + "#Lsrc/checkout/placeOrder.tsT42",
    )
    assert.strictEqual(bitbucketAnchor("x.ts"), "#Lx.ts")
  })

  it("a comparison is asked for as base..head, not head..base", async () => {
    const { fetcher, urls } = stub({
      "/diff/": "diff --git a/x b/x\n",
      "/commits": { size: 2 },
    })
    const gitAdapter = new BitbucketAdapter({
      repo: "acme/storefront",
      ...credentials,
      fetcher,
    })
    await gitAdapter.compare("aaaaaaa", "bbbbbbb")
    const diff = urls().find((url) => url.includes("/diff/"))
    assert.ok(diff !== undefined, "no diff request was made")
    assert.ok(diff.includes("/diff/aaaaaaa..bbbbbbb"), diff)
    assert.ok(!diff.includes("/diff/bbbbbbb..aaaaaaa"), `inverted: ${diff}`)
  })

  it("a comparison counts the commits between the two", async () => {
    const { fetcher } = stub({
      "/diff/": "diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n",
      "/commits": { size: 3 },
    })
    const gitAdapter = new BitbucketAdapter({
      repo: "acme/storefront",
      ...credentials,
      fetcher,
    })
    const comparison = await gitAdapter.compare("aaaaaaa", "bbbbbbb")
    assert.strictEqual(comparison.commits, 3)
    assert.deepStrictEqual(
      comparison.files.map((file) => file.path),
      ["x"],
    )
  })

  it("bitbucket.org as an explicit base URL is still Cloud and any other host is Data Center", () => {
    assert.ok(isCloudUrl("https://bitbucket.org"))
    assert.ok(isCloudUrl("https://api.bitbucket.org/2.0"))
    assert.ok(isCloudUrl(""))
    assert.ok(!isCloudUrl("https://bitbucket.example.com"))
  })
})
