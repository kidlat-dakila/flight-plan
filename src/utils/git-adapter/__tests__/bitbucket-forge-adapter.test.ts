import { describe, expect, it } from "vitest"
import { GitAdapterError, type Fetcher } from "../../../lib/git-adapter/types"
import { BitbucketForgeAdapter } from "../custom-providers/bitbucket-forge-adapter"
import { createRest } from "../helpers/rest"

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })

function providerAnswering(routes: Record<string, Response>): {
  provider: BitbucketForgeAdapter
  urls: string[]
} {
  const urls: string[] = []
  const fetcher: Fetcher = (input) => {
    urls.push(input)
    const key = Object.keys(routes).find((route) => input.includes(route))
    return Promise.resolve(key === undefined ? new Response("missing", { status: 404 }) : routes[key]!.clone())
  }
  const rest = createRest({
    baseUrl: "https://api.bitbucket.org/2.0",
    name: "Bitbucket",
    headers: {},
    fetcher,
    sleep: () => Promise.resolve(),
  })
  return { provider: new BitbucketForgeAdapter({ rest }), urls }
}

const rawPullRequest = (id: number, extra: object = {}) => ({
  id,
  title: `PR ${String(id)}`,
  description: "",
  state: "OPEN",
  draft: false,
  created_on: "2026-01-01T00:00:00Z",
  updated_on: "2026-01-02T00:00:00Z",
  author: { nickname: "ada" },
  links: { html: { href: `https://bitbucket.org/acme/shop/pull-requests/${String(id)}` } },
  source: { branch: { name: "topic" }, commit: { hash: "abc123def456" } },
  destination: { branch: { name: "main" } },
  ...extra,
})

describe("BitbucketForgeAdapter", () => {
  it("maps a pull request, keeping the abbreviated head hash as given", async () => {
    const { provider, urls } = providerAnswering({ "/pullrequests/7": json(rawPullRequest(7)) })
    const pullRequest = await provider.pullRequests.get("acme", "shop", 7)

    expect(pullRequest.headSha).toBe("abc123def456")
    expect(pullRequest.targetBranch).toBe("main")
    expect(pullRequest.author.login).toBe("ada")
    expect(urls[0]).toContain("repositories/acme/shop/pullrequests/7")
  })

  it("lists open pull requests, most recently updated first", async () => {
    const { provider, urls } = providerAnswering({
      "/pullrequests?": json({ values: [rawPullRequest(1, { draft: true })], next: "more" }),
    })
    const page = await provider.pullRequests.list("acme", "shop", { state: "open", perPage: 10 })

    expect(page.items.map((item) => item.number)).toEqual([1])
    expect(page.items[0]?.draft).toBe(true)
    expect(page.hasNextPage).toBe(true)
    expect(urls[0]).toContain("state=OPEN")
    expect(urls[0]).toContain("sort=-updated_on")
    expect(urls[0]).toContain("pagelen=10")
  })

  it("reads a file at a revision in slices", async () => {
    const { provider } = providerAnswering({ "/src/": new Response("0123456789") })
    const first = await provider.repos.readContents("acme", "shop", "a.ts", { ref: "abc", maxChars: 4 })
    const second = await provider.repos.readContents("acme", "shop", "a.ts", {
      ref: "abc",
      offset: 4,
      maxChars: 10,
    })

    expect(first).toMatchObject({ type: "file", content: "0123", nextOffset: 4, truncated: true })
    expect(second).toMatchObject({ content: "456789", nextOffset: null, truncated: false })
  })

  it("counts the commits between two revisions, oldest first", async () => {
    const { provider, urls } = providerAnswering({
      "/commits?": json({
        size: 2,
        values: [
          { hash: "bbb", message: "second", author: { raw: "Ada <ada@example.com>" } },
          { hash: "aaa", message: "first", author: { raw: "Ada <ada@example.com>" } },
        ],
      }),
    })
    const comparison = await provider.commits.compare("acme", "shop", "old", "new")

    expect(comparison.totalCount).toBe(2)
    expect(comparison.items.map((commit) => commit.sha)).toEqual(["aaa", "bbb"])
    expect(comparison.items[0]?.author).toMatchObject({ name: "Ada", email: "ada@example.com" })
    expect(urls[0]).toContain("include=new")
    expect(urls[0]).toContain("exclude=old")
  })

  it("refuses what Bitbucket has no use for, by name", async () => {
    const { provider } = providerAnswering({})
    const error = await provider.issues.list("acme", "shop").catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(GitAdapterError)
    expect((error as GitAdapterError).problem).toBe("unsupported")
  })
})
