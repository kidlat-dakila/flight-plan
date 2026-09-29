import * as assert from "assert"
import { afterEach, vi } from "vitest"
import { stubGlobalFetch } from "./stubGlobalFetch"
import { githubApiRoot } from "../../github-adapter"
import { GithubTokenAdapter } from "../../github-token-adapter"
import { GitlabAdapter, gitlabApiRoot, gitlabDiffAnchor } from "../../gitlab-adapter"
import { BitbucketAdapter, bitbucketAnchor } from "../../bitbucket-adapter"
import { GitAdapterError, sameCommit, type Fetcher } from "../../../../lib/git-adapter/types"

/**
 * A fetcher that answers by URL pattern and records every request.
 *
 * These tests are about the *requests*, not the parsing. Every one of them
 * pins a fact that is silent when wrong: a merge request addressed by the
 * wrong number reads somebody else's, a project path encoded the wrong way
 * reaches a route that does not exist, and a diff asked for without its media
 * type comes back as JSON that looks like a successful answer.
 */
function stub(routes: Record<string, unknown>): {
  fetcher: Fetcher
  urls: string[]
  headers: Record<string, string>[]
} {
  const urls: string[] = []
  const headers: Record<string, string>[] = []
  return {
    urls,
    headers,
    fetcher: (input, init) => {
      urls.push(input)
      headers.push(Object.fromEntries(new Headers(init?.headers).entries()))
      const key = Object.keys(routes).find((route) => input.includes(route))
      if (key === undefined) {
        return Promise.resolve(new Response("not found", { status: 404 }))
      }
      const body = routes[key]
      return Promise.resolve(
        typeof body === "string"
          ? new Response(body, { status: 200 })
          : new Response(JSON.stringify(body), {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
      )
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

suite("GitHub over a token", () => {
  test("the API root is the cloud one, or Enterprise's /api/v3", () => {
    assert.strictEqual(githubApiRoot(""), "https://api.github.com")
    assert.strictEqual(
      githubApiRoot("https://ghe.example.com"),
      "https://ghe.example.com/api/v3",
    )
    // Already suffixed, because somebody will paste the whole thing.
    assert.strictEqual(
      githubApiRoot("https://ghe.example.com/api/v3"),
      "https://ghe.example.com/api/v3",
    )
  })

  /*
   * The switch that exists because `gh pr list` is GraphQL and REST has no
   * single equivalent. With no review filter the plain list is used, which is
   * not rate limited the way search is and carries the head commit; with one,
   * only search can answer.
   */
  test("no review filter uses the plain list rather than search", async () => {
    const { urls } = stubGlobalFetch({ "/pulls": [], "/search/issues": { items: [] } })
    const gitAdapter = new GithubTokenAdapter({
      repo: "acme/storefront",
      token: "t",
      baseUrl: "",
    })
    await gitAdapter.listTargets({ includeMine: false })
    assert.ok(urls.some((url) => url.includes("/repos/acme/storefront/pulls")))
    assert.ok(!urls.some((url) => url.includes("/search/issues")))
  })

  test("a review filter switches to the search endpoint", async () => {
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
    const search = urls.find((url) => url.includes("/search/issues"))
    assert.notStrictEqual(search, undefined)
    const query = decodeURIComponent(search ?? "")
    assert.ok(query.includes("repo:acme/storefront"))
    assert.ok(query.includes("is:pr"))
    assert.ok(query.includes("review-requested:@me"))
  })

  /*
   * The call every typed GitHub client has to cast its way out of: the same
   * path as the pull request object, distinguished only by `Accept`. Without
   * the header the response is JSON, which parses fine and is not a diff.
   */
  test("the diff is asked for by media type", async () => {
    const { headers } = stubGlobalFetch({ "/pulls/7": "diff --git a/x b/x\n" })
    const gitAdapter = new GithubTokenAdapter({
      repo: "acme/storefront",
      token: "t",
      baseUrl: "",
    })
    const diff = await gitAdapter.diff({ kind: "pr", number: 7 })
    assert.ok(diff.startsWith("diff --git"))
    assert.strictEqual(
      headers[0]?.accept,
      "application/vnd.github.v3.diff",
    )
  })

  test("the token is sent in the authorization header", async () => {
    const { headers } = stubGlobalFetch({ "/labels": [] })
    const gitAdapter = new GithubTokenAdapter({
      repo: "acme/storefront",
      token: "s3cret",
      baseUrl: "",
    })
    await gitAdapter.listLabels()
    assert.strictEqual(headers[0]?.authorization, "token s3cret")
  })

  test("a branch row is refused where only a pull request has the answer", async () => {
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

suite("GitLab", () => {
  test("the API root is the cloud one, or an instance's", () => {
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

  /*
   * A nested group path is one path segment, slashes and all. `encodeURI`
   * would leave the slashes and address a route that does not exist; this is
   * the single most likely way GitLab support breaks for the enterprise
   * installs that self-hosting is aimed at.
   */
  test("a nested project path is encoded whole, slashes included", async () => {
    const { urls } = stubGlobalFetch({ "/merge_requests": [] })
    const gitAdapter = new GitlabAdapter({
      repo: "group/subgroup/project",
      token: "t",
      baseUrl: "",
    })
    await gitAdapter.listTargets({ includeMine: false })
    assert.ok(
      urls[0]?.includes("/projects/group%2Fsubgroup%2Fproject/merge_requests"),
      urls[0],
    )
  })

  /*
   * `iid`, not `id`. A merge request has both; `id` is unique across the whole
   * instance, and using it addresses somebody else's merge request in another
   * project — quietly, with a 200.
   */
  test("a merge request is addressed by its iid", async () => {
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
    assert.ok(urls[0]?.endsWith("/merge_requests/42"), urls[0])
  })

  test("the token is sent in GitLab's own header, not as a bearer", async () => {
    const { headers } = stubGlobalFetch({ "/labels": [] })
    const gitAdapter = new GitlabAdapter({
      repo: "acme/storefront",
      token: "s3cret",
      baseUrl: "",
    })
    await gitAdapter.listLabels()
    assert.strictEqual(headers[0]?.["private-token"], "s3cret")
    assert.strictEqual(headers[0]?.authorization, undefined)
  })

  /*
   * `raw_diffs` is the only endpoint that answers with a real unified diff in
   * one request — and the one no GitLab client library exposes, which is most
   * of the reason this adapter talks to the API directly.
   */
  test("the diff comes from raw_diffs, not the deprecated changes endpoint", async () => {
    const { urls } = stubGlobalFetch({ "/raw_diffs": "diff --git a/x b/x\n" })
    const gitAdapter = new GitlabAdapter({
      repo: "acme/storefront",
      token: "t",
      baseUrl: "",
    })
    await gitAdapter.diff({ kind: "pr", number: 5 })
    assert.ok(urls[0]?.endsWith("/merge_requests/5/raw_diffs"), urls[0])
    assert.ok(!urls.some((url) => url.includes("/changes")))
  })

  test("a comparison maps GitLab's flags onto file statuses", async () => {
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
    assert.strictEqual(renamed?.previousPath, "old.ts")
    // An empty diff string is no patch at all, not a patch that changed
    // nothing — `classify` reads those two differently.
    assert.strictEqual(renamed?.patch, undefined)
  })

  /*
   * File level only. A GitLab line anchor is `sha1(path)_old_new` and needs
   * both line numbers; for a line the change added there is no old number, and
   * guessing one sends the reader confidently to the wrong place.
   */
  test("a permalink points at the file in the diff, hashed with SHA-1", () => {
    const gitAdapter = new GitlabAdapter({
      repo: "group/sub/proj",
      token: "t",
      baseUrl: "https://gitlab.example.com",
    })
    const link = gitAdapter.permalink({ kind: "pr", number: 12 }, "src/checkout/placeOrder.ts")
    assert.strictEqual(
      link,
      "https://gitlab.example.com/group/sub/proj/-/merge_requests/12/diffs#" +
        gitlabDiffAnchor("src/checkout/placeOrder.ts"),
    )
    // SHA-1, which is 40 hex characters — not GitHub's SHA-256.
    assert.strictEqual(gitlabDiffAnchor("x").length, 40)
  })
})

suite("Bitbucket Cloud", () => {
  const credentials = { username: "someone", token: "s3cret", baseUrl: "" }

  test("it declares no labels and no review filters, because it has neither", () => {
    const gitAdapter = new BitbucketAdapter({
      repo: "acme/storefront",
      ...credentials,
      fetcher: stub({}).fetcher,
    })
    assert.ok(!gitAdapter.supports("labels"))
    assert.ok(!gitAdapter.supports("filters"))
    assert.deepStrictEqual(gitAdapter.reviewFilters(), [])
  })

  test("it authenticates with basic credentials", async () => {
    const { fetcher, headers } = stub({ "/pullrequests": { values: [] } })
    const gitAdapter = new BitbucketAdapter({
      repo: "acme/storefront",
      ...credentials,
      fetcher,
    })
    await gitAdapter.listTargets({})
    assert.strictEqual(
      headers[0]?.authorization,
      `Basic ${Buffer.from("someone:s3cret", "utf8").toString("base64")}`,
    )
  })

  /*
   * The abbreviated hash. Bitbucket's own schema allows seven characters and
   * up, and live responses come back at twelve, while a walkthrough records the
   * full SHA it was written against. `===` between those is false for the same
   * commit, which would report every Bitbucket walkthrough as stale.
   */
  test("an abbreviated head hash is returned as given and still matches", async () => {
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

  /*
   * The anchor embeds the path literally, which is the only one of the three
   * hosts that does. Undocumented by Atlassian and confirmed from a real link
   * plus two third-party implementations, so it is worth pinning here: if it
   * ever changes, this is where it shows up.
   */
  test("a permalink embeds the path unhashed", () => {
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
      "https://bitbucket.org/acme/storefront/pull-requests/9/diff" +
        "#Lsrc/checkout/placeOrder.tsT42",
    )
    assert.strictEqual(bitbucketAnchor("x.ts"), "#Lx.ts")
  })

  /*
   * The ordering, pinned because getting it wrong is silent.
   *
   * Bitbucket's spec reads from the first commit to the second, which is the
   * opposite of what its `{source}..{destination}` wording suggests. Verified
   * against a linear history on a public repository: `older..newer` reports the
   * newer commit's work as additions, `newer..older` reports the same lines as
   * deletions. An inverted diff hands the staleness check head-side line
   * numbers where it expects old-side ones, and it then judges a walkthrough on
   * the wrong lines entirely — with no error anywhere.
   */
  test("a comparison is asked for as base..head, not head..base", async () => {
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
    const diff = urls.find((url) => url.includes("/diff/"))
    assert.ok(diff !== undefined, "no diff request was made")
    assert.ok(diff.includes("/diff/aaaaaaa..bbbbbbb"), diff)
    assert.ok(!diff.includes("/diff/bbbbbbb..aaaaaaa"), `inverted: ${diff}`)
  })

  test("a comparison counts the commits between the two", async () => {
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

  /*
   * Data Center is a different product with a different API. Refusing it by
   * name is the honest answer; pointing Cloud's 2.0 paths at it produces a run
   * of 404s that read as a permissions problem.
   */
  test("a Data Center instance is refused by name rather than half-working", async () => {
    const gitAdapter = new BitbucketAdapter({
      repo: "PROJ/repo",
      username: "someone",
      token: "s3cret",
      baseUrl: "https://bitbucket.example.com",
      fetcher: stub({}).fetcher,
    })
    assert.strictEqual(gitAdapter.capabilities.size, 0)
    assert.ok(!gitAdapter.supports("list"))
    await assert.rejects(
      async () => gitAdapter.listTargets({}),
      (cause: unknown) =>
        cause instanceof GitAdapterError &&
        cause.problem === "unsupported" &&
        cause.message.includes("Data Center"),
    )
  })

  test("bitbucket.org as an explicit base URL is still Cloud", () => {
    const gitAdapter = new BitbucketAdapter({
      repo: "acme/storefront",
      username: "someone",
      token: "s3cret",
      baseUrl: "https://bitbucket.org",
      fetcher: stub({}).fetcher,
    })
    assert.ok(gitAdapter.supports("list"))
  })
})
