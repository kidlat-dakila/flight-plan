import * as assert from "assert"
import { afterEach, vi } from "vitest"
import { stubGlobalFetch } from "./stubGlobalFetch"
import { GithubTokenAdapter } from "../../github-token-adapter"
import { GitlabAdapter } from "../../gitlab-adapter"
import { BitbucketAdapter } from "../../bitbucket-adapter"
import { githubAvatar, githubReviewState } from "../githubShared"
import { mergeReviewers, GitAdapterError, type Fetcher, type GitAdapter, type Reviewer } from "../../../../lib/git-adapter/types"
import { buildReviewHeader } from "../../../../lib/review/reviewHeader"
import { fetchableAvatar, inlineAvatars } from "../../../../lib/review/avatars"

/**
 * Who is reviewing a change, and how each host says it.
 *
 * These pin the *mapping*, because every one of the four hosts models review
 * differently and a wrong mapping is silent: an avatar with the wrong pip looks
 * exactly as confident as one with the right pip, and it says something untrue
 * about a named person.
 */

function stub(routes: Record<string, unknown>): Fetcher {
  return (input) => {
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
  test("one entry per person, with the last state winning", () => {
    // The case this exists for: GitHub returns one row per submitted review, so
    // somebody who objected and later approved is two rows. Drawing both would
    // show one person disagreeing with themselves.
    const merged = mergeReviewers([
      { login: "ada", avatarUrl: "a", state: "changes-requested" },
      { login: "ada", avatarUrl: "a", state: "approved" },
    ])
    assert.strictEqual(merged.length, 1)
    assert.strictEqual(merged[0]?.state, "approved")
  })

  test("a re-request after an approval returns them to pending", () => {
    // Not a quirk of the merge: it is why the requested list is applied last in
    // every adapter. Somebody asked to look again has not looked again.
    const merged = mergeReviewers([
      { login: "ada", avatarUrl: "a", state: "approved" },
      { login: "ada", avatarUrl: "a", state: "pending" },
    ])
    assert.strictEqual(merged[0]?.state, "pending")
  })

  test("keeps a picture and a name that a later bare row does not repeat", () => {
    const merged = mergeReviewers([
      { login: "ada", name: "Ada L", avatarUrl: "https://pic", state: "commented" },
      { login: "ada", avatarUrl: "", state: "pending" },
    ])
    assert.strictEqual(merged[0]?.avatarUrl, "https://pic")
    assert.strictEqual(merged[0]?.name, "Ada L")
  })

  test("matches a handle case-insensitively but keeps the host's order", () => {
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

  test("drops a row with no handle rather than drawing a faceless chip", () => {
    assert.strictEqual(mergeReviewers([{ login: "", avatarUrl: "", state: "pending" }]).length, 0)
  })
})

suite("GitHub's review states", () => {
  test("the three it names map across, and everything else is pending", () => {
    assert.strictEqual(githubReviewState("APPROVED"), "approved")
    assert.strictEqual(githubReviewState("CHANGES_REQUESTED"), "changes-requested")
    assert.strictEqual(githubReviewState("COMMENTED"), "commented")
  })

  test("a dismissed review means they are expected to look again", () => {
    // Not a state of its own, and deliberately not `commented`: a dismissed
    // review has been set aside, so the only honest reading is `pending`.
    assert.strictEqual(githubReviewState("DISMISSED"), "pending")
    assert.strictEqual(githubReviewState("PENDING"), "pending")
    assert.strictEqual(githubReviewState("SOMETHING_NEW"), "pending")
  })

  test("an avatar is derivable from a handle, which is all `gh` returns", () => {
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

  test("the latest review per person, with requests applied after", async () => {
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

  test("a branch is refused rather than read as pull request zero", async () => {
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

  test("an approver is approved and every other reviewer is pending", async () => {
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

  test("somebody who approved without being asked is still shown", async () => {
    // Ordinary on GitLab: anyone with access may approve, and on a project with
    // approval rules that is the normal path. Listing only the named reviewers
    // would hide the people who actually approved it.
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

  test("an instance with no approvals feature costs the marks, not the header", async () => {
    // `/approvals` 404s on an instance without it. Everyone falls back to
    // pending, which is exactly what the reviewer list on its own says.
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

  test("a null avatar_url becomes empty rather than the string null", async () => {
    // GitLab types this field as nullable, and `?? \"\"` does not catch a
    // present key whose value is null.
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
      baseUrl: "",
      fetcher: stub(routes),
    })

  test("the state decides, not the approved boolean", async () => {
    // `approved` is false for somebody who requested changes, which makes them
    // indistinguishable from somebody who has done nothing — the one
    // distinction the header exists to draw.
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

  test("an onlooker is dropped, unless they actually did something", async () => {
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

suite("inlining an avatar", () => {
  const png = (bytes = 8): Response =>
    new Response(Buffer.alloc(bytes, 1), {
      status: 200,
      headers: { "content-type": "image/png" },
    })

  test("only https is even attempted", () => {
    assert.ok(fetchableAvatar("https://example.com/a.png"))
    assert.ok(!fetchableAvatar("http://example.com/a.png"))
    // These come out of a host's JSON, which is data rather than instruction.
    assert.ok(!fetchableAvatar("file:///etc/passwd"))
    assert.ok(!fetchableAvatar("data:image/png;base64,AAAA"))
    assert.ok(!fetchableAvatar("not a url"))
  })

  test("a raster image becomes a data: URI", async () => {
    const found = await inlineAvatars(["https://a/1.png"], {
      fetcher: () => Promise.resolve(png()),
    })
    assert.ok(found.get("https://a/1.png")?.startsWith("data:image/png;base64,"))
  })

  test("each distinct URL is fetched once, however often it appears", async () => {
    // The author of a change is very often one of its reviewers.
    let calls = 0
    const found = await inlineAvatars(["https://a/1.png", "https://a/1.png"], {
      fetcher: () => {
        calls += 1
        return Promise.resolve(png())
      },
    })
    assert.strictEqual(calls, 1)
    assert.strictEqual(found.size, 1)
  })

  test("an SVG is refused, and so is anything else not on the list", async () => {
    const found = await inlineAvatars(["https://a/1.svg"], {
      fetcher: () =>
        Promise.resolve(
          new Response("<svg/>", {
            status: 200,
            headers: { "content-type": "image/svg+xml" },
          }),
        ),
    })
    assert.strictEqual(found.size, 0)
  })

  test("an oversized picture is dropped after being read, not on its header", async () => {
    // `content-length` says what a host intends to send, not what arrived.
    const found = await inlineAvatars(["https://a/1.png"], {
      maxBytes: 4,
      fetcher: () => Promise.resolve(png(64)),
    })
    assert.strictEqual(found.size, 0)
  })

  test("one failure costs one picture and nothing else", async () => {
    const found = await inlineAvatars(["https://a/1.png", "https://a/2.png"], {
      fetcher: (input) =>
        input.endsWith("1.png")
          ? Promise.reject(new Error("refused"))
          : Promise.resolve(png()),
    })
    assert.deepStrictEqual([...found.keys()], ["https://a/2.png"])
  })

  test("the count is capped, so a crowded change cannot stall the header", async () => {
    const urls = Array.from({ length: 40 }, (_, i) => `https://a/${String(i)}.png`)
    let calls = 0
    await inlineAvatars(urls, {
      maxImages: 3,
      fetcher: () => {
        calls += 1
        return Promise.resolve(png())
      },
    })
    assert.strictEqual(calls, 3)
  })
})

suite("building the header", () => {
  const target = {
    ref: { kind: "pr", number: 3 } as const,
    title: "Cancel run() on a caller abort",
    author: "dee",
    url: "https://example.com/pull/3",
    updatedAt: "",
    isDraft: false,
    reason: "mine" as const,
  }

  const fake = (over: Partial<GitAdapter>): GitAdapter =>
    ({
      id: "git",
      name: "git",
      capabilities: new Set(),
      repo: "acme/storefront",
      supports: () => false,
      ...over,
    }) as GitAdapter

  test("a adapter without the capability gets the bare header", async () => {
    const header = await buildReviewHeader(
      { ...target, ref: { kind: "branch", name: "stock-check" } },
      fake({ supports: () => false }),
    )
    assert.strictEqual(header.kind, "bare")
    if (header.kind !== "bare") return
    assert.strictEqual(header.branch, "stock-check")
    assert.strictEqual(header.gitAdapterName, "git")
  })

  test("the capability decides it, not a call that threw", async () => {
    /*
     * A adapter that *can* answer and failed gets the review header with no
     * faces, never the bare one. The bare header says "your adapter cannot do
     * this, here is how to fix it", which would be a lie about an expired
     * token — and it would send the reader to a setup view that has nothing
     * wrong with it.
     */
    const header = await buildReviewHeader(
      target,
      fake({
        supports: () => true,
        reviewers: () => Promise.reject(new GitAdapterError("bad credentials", "auth")),
      }),
    )
    assert.strictEqual(header.kind, "review")
    if (header.kind !== "review") return
    assert.strictEqual(header.author.login, "dee")
    assert.deepStrictEqual(header.reviewers, [])
    assert.strictEqual(header.url, target.url)
  })

  test("a working adapter is passed through, labelled by number", async () => {
    const reviewers: Reviewer[] = [{ login: "ada", avatarUrl: "", state: "approved" }]
    const header = await buildReviewHeader(
      target,
      fake({
        supports: () => true,
        reviewers: () =>
          Promise.resolve({ author: { login: "dee", avatarUrl: "" }, reviewers }),
      }),
    )
    assert.strictEqual(header.kind, "review")
    if (header.kind !== "review") return
    assert.strictEqual(header.label, "#3")
    assert.deepStrictEqual(
      header.reviewers.map((one) => one.state),
      ["approved"],
    )
  })
})
