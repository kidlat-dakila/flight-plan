import { describe, expect, it, vi } from "vitest"
import { BitbucketForgeAdapter } from "@/utils/git-adapter/custom-providers/bitbucket-forge-adapter"
import { createRest } from "@/utils/git-adapter/helpers/rest"
import { GitAdapterError, type Fetcher } from "@/utils/git-adapter/types"

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })

function parseBody(body: unknown): unknown {
  return typeof body === "string" ? (JSON.parse(body) as unknown) : undefined
}

function providerAnswering(routes: Record<string, Response>): {
  provider: BitbucketForgeAdapter
  urls: () => string[]
  requests: () => { url: string, method: string, body: unknown }[]
} {
  const fetcher = vi.fn<Fetcher>(async (input) => {
    const key = Object.keys(routes).find((route) => input.includes(route))
    return await Promise.resolve(key === undefined ? new Response("missing", { status: 404 }) : routes[key].clone())
  })
  const rest = createRest({
    baseUrl: "https://api.bitbucket.org/2.0",
    name: "Bitbucket",
    headers: {},
    fetcher,
    sleep: async () => { await Promise.resolve() },
  })
  return {
    provider: new BitbucketForgeAdapter({ rest }),
    urls: () => fetcher.mock.calls.map(([input]) => input),
    requests: () =>
      fetcher.mock.calls.map(([input, init]) => ({
        url: input,
        method: init?.method ?? "GET",
        body: parseBody(init?.body),
      })),
  }
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

const rawRepository = {
  uuid: "{uuid-1}",
  name: "shop",
  full_name: "acme/shop",
  description: "The shop",
  is_private: true,
  mainbranch: { name: "main" },
  links: {
    html: { href: "https://bitbucket.org/acme/shop" },
    clone: [
      { name: "https", href: "https://bitbucket.org/acme/shop.git" },
      { name: "ssh", href: "git@bitbucket.org:acme/shop.git" },
    ],
  },
  parent: null,
  workspace: { slug: "acme", links: { avatar: { href: "https://avatar/acme" } } },
}

const rawIssue = (id: number, extra: object = {}) => ({
  id,
  title: `Issue ${String(id)}`,
  content: { raw: "body" },
  state: "open",
  reporter: { nickname: "ada" },
  created_on: "2026-01-01T00:00:00Z",
  updated_on: "2026-01-02T00:00:00Z",
  links: { html: { href: `https://bitbucket.org/acme/shop/issues/${String(id)}` } },
  ...extra,
})

const rawComment = (id: number, extra: object = {}) => ({
  id,
  content: { raw: `comment ${String(id)}` },
  user: { nickname: "ada" },
  created_on: "2026-01-01T00:00:00Z",
  updated_on: "2026-01-02T00:00:00Z",
  links: { html: { href: `https://bitbucket.org/acme/shop/pull-requests/7#comment-${String(id)}` } },
  ...extra,
})

describe("BitbucketForgeAdapter", () => {
  it("maps a pull request, keeping the abbreviated head hash as given", async () => {
    const { provider, urls } = providerAnswering({ "/pullrequests/7": json(rawPullRequest(7)) })
    const pullRequest = await provider.pullRequests.get("acme", "shop", 7)

    expect(pullRequest.headSha).toBe("abc123def456")
    expect(pullRequest.targetBranch).toBe("main")
    expect(pullRequest.author.login).toBe("ada")
    expect(urls()[0]).toContain("repositories/acme/shop/pullrequests/7")
  })

  it("lists open pull requests, most recently updated first", async () => {
    const { provider, urls } = providerAnswering({
      "/pullrequests?": json({ values: [rawPullRequest(1, { draft: true })], next: "more" }),
    })
    const page = await provider.pullRequests.list("acme", "shop", { state: "open", perPage: 10 })

    expect(page.items.map((item) => item.number)).toStrictEqual([1])
    expect(page.items[0]?.draft).toBe(true)
    expect(page.hasNextPage).toBe(true)
    expect(urls()[0]).toContain("state=OPEN")
    expect(urls()[0]).toContain("sort=-updated_on")
    expect(urls()[0]).toContain("pagelen=10")
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
    expect(comparison.items.map((commit) => commit.sha)).toStrictEqual(["aaa", "bbb"])
    expect(comparison.items[0]?.author).toMatchObject({ name: "Ada", email: "ada@example.com" })
    expect(urls()[0]).toContain("include=new")
    expect(urls()[0]).toContain("exclude=old")
  })

  it("refuses labels and assignee logins that Bitbucket issues cannot hold", async () => {
    const { provider, requests } = providerAnswering({})
    const labelled = await provider.issues
      .create("acme", "shop", { title: "t", body: "b", labels: ["bug"] })
      .catch((cause: unknown) => cause)
    const assigned = await provider.pullRequests
      .create("acme", "shop", { title: "t", body: "b", sourceBranch: "a", targetBranch: "b", assignees: ["ada"] })
      .catch((cause: unknown) => cause)

    expect(labelled).toBeInstanceOf(GitAdapterError)
    expect(labelled).toMatchObject({ problem: "unsupported" })
    expect(assigned).toMatchObject({ problem: "unsupported" })
    expect(requests()).toStrictEqual([])
  })

  it("lists the repositories of a workspace", async () => {
    const { provider, urls } = providerAnswering({
      "repositories/acme?": json({ size: 1, values: [rawRepository] }),
    })
    const page = await provider.repos.list("acme", { perPage: 5 })

    expect(page.items[0]).toMatchObject({
      fullName: "acme/shop",
      private: true,
      defaultBranch: "main",
      cloneUrl: "https://bitbucket.org/acme/shop.git",
      isFork: false,
      parent: null,
      owner: { login: "acme", avatarUrl: "https://avatar/acme" },
    })
    expect(urls()[0]).toContain("pagelen=5")
  })

  it("reads a repository and names its upstream when it is a fork", async () => {
    const { provider } = providerAnswering({
      "repositories/acme/shop": json({
        ...rawRepository,
        parent: { full_name: "origin/shop", links: { html: { href: "https://bitbucket.org/origin/shop" } } },
      }),
    })
    const repository = await provider.repos.get("acme", "shop")

    expect(repository.isFork).toBe(true)
    expect(repository.parent).toStrictEqual({ fullName: "origin/shop", url: "https://bitbucket.org/origin/shop" })
  })

  it("lists open issues by default and maps their state", async () => {
    const { provider, urls } = providerAnswering({
      "/issues?": json({ values: [rawIssue(1), rawIssue(2, { state: "wontfix", assignee: { nickname: "grace" } })] }),
    })
    const page = await provider.issues.list("acme", "shop")

    expect(page.items.map((issue) => issue.state)).toStrictEqual(["open", "closed"])
    expect(page.items[1]?.assignees).toStrictEqual([{ login: "grace" }])
    expect(page.items[0]?.author.login).toBe("ada")
    expect(new URL(urls()[0] ?? "").searchParams.get("q")).toBe(
      "state=\"new\" OR state=\"open\" OR state=\"submitted\" OR state=\"on hold\"",
    )
  })

  it("creates an issue with the body as raw content", async () => {
    const { provider, requests } = providerAnswering({ "/issues": json(rawIssue(9)) })
    const issue = await provider.issues.create("acme", "shop", { title: "Broken", body: "It breaks" })

    expect(issue.number).toBe(9)
    expect(requests()[0]).toMatchObject({
      method: "POST",
      body: { title: "Broken", content: { raw: "It breaks" } },
    })
  })

  it("opens a pull request from a source branch to a target branch", async () => {
    const { provider, requests } = providerAnswering({ "/pullrequests": json(rawPullRequest(12)) })
    const pullRequest = await provider.pullRequests.create("acme", "shop", {
      title: "Add cart",
      body: "Adds the cart",
      sourceBranch: "topic",
      targetBranch: "main",
      draft: true,
    })

    expect(pullRequest.number).toBe(12)
    expect(requests()[0]).toMatchObject({
      method: "POST",
      body: {
        title: "Add cart",
        description: "Adds the cart",
        source: { branch: { name: "topic" } },
        destination: { branch: { name: "main" } },
        draft: true,
      },
    })
  })

  it("reads a commit with its changed files", async () => {
    const { provider } = providerAnswering({
      "/diffstat/": json({
        values: [
          { status: "modified", lines_added: 3, lines_removed: 1, old: { path: "a.ts" }, new: { path: "a.ts" } },
          { status: "removed", lines_added: 0, lines_removed: 9, old: { path: "b.ts" }, new: null },
        ],
      }),
      "/commit/": json({ hash: "abc", message: "Fix", author: { raw: "Ada <ada@example.com>" }, parents: [{ hash: "p1" }] }),
    })
    const commit = await provider.commits.get("acme", "shop", "abcdef1")

    expect(commit).toMatchObject({ sha: "abc", parents: ["p1"], filesComplete: true })
    expect(commit.files).toStrictEqual([
      { path: "a.ts", status: "modified", additions: 3, deletions: 1 },
      { path: "b.ts", status: "removed", additions: 0, deletions: 9 },
    ])
  })

  it("lists pull request comments without the deleted ones", async () => {
    const { provider, urls } = providerAnswering({
      "/comments?": json({
        size: 2,
        values: [rawComment(1, { content: { raw: "Looks good" } }), rawComment(2, { deleted: true })],
      }),
    })
    const page = await provider.pullRequests.listComments("acme", "shop", 7)

    expect(page.items).toMatchObject([{ id: "1", body: "Looks good", author: { login: "ada" } }])
    expect(urls()[0]).toContain("pullrequests/7/comments")
  })

  it("reads one pull request comment", async () => {
    const { provider, urls } = providerAnswering({ "/comments/4": json(rawComment(4)) })
    const comment = await provider.pullRequests.getComment("acme", "shop", 7, "4")

    expect(comment.id).toBe("4")
    expect(urls()[0]).toContain("pullrequests/7/comments/4")
  })

  it("reads the signed-in user and a user by id", async () => {
    const { provider, urls } = providerAnswering({
      "/user": json({ account_id: "557", nickname: "ada", display_name: "Ada Lovelace", links: { avatar: { href: "https://avatar/ada" } } }),
    })
    const viewer = await provider.users.authenticated()
    const user = await provider.users.get("557")

    expect(viewer).toMatchObject({ id: "557", login: "ada", name: "Ada Lovelace", avatarUrl: "https://avatar/ada" })
    expect(user.login).toBe("ada")
    expect(urls()[1]).toContain("users/557")
  })

  describe("review threads", () => {
    const threadComments = json({
      values: [
        rawComment(1, { inline: { path: "a.ts", to: 12, from: null }, resolution: { type: "comment_resolution" } }),
        rawComment(2, { parent: { id: 1 } }),
        rawComment(3),
        rawComment(4, { parent: { id: 2 } }),
      ],
    })

    it("groups replies under the comment that started the thread", async () => {
      const { provider } = providerAnswering({ "/comments?": threadComments })
      const page = await provider.threads.list("acme", "shop", 7)

      expect(page.items).toMatchObject([
        { id: "1", isResolved: true, path: "a.ts", line: 12, comments: [{ id: "1" }, { id: "2" }, { id: "4" }] },
        { id: "3", isResolved: false, path: "", line: null, comments: [{ id: "3" }] },
      ])
    })

    it("filters threads by state", async () => {
      const { provider } = providerAnswering({ "/comments?": threadComments })
      const page = await provider.threads.list("acme", "shop", 7, { state: "unresolved" })

      expect(page.items.map((thread) => thread.id)).toStrictEqual(["3"])
      expect(page.totalCount).toBe(1)
    })

    it("reads one thread and fails when it does not exist", async () => {
      const { provider } = providerAnswering({ "/comments?": threadComments })
      const thread = await provider.threads.get("acme", "shop", 7, "3")
      const missing = await provider.threads.get("acme", "shop", 7, "99").catch((cause: unknown) => cause)

      expect(thread.id).toBe("3")
      expect(missing).toBeInstanceOf(GitAdapterError)
    })

    it("replies to a thread by naming its first comment as the parent", async () => {
      const { provider, requests } = providerAnswering({ "/comments": json(rawComment(5, { parent: { id: 3 } })) })
      const reply = await provider.threads.reply("acme", "shop", 7, "3", { body: "Done" })

      expect(reply.id).toBe("5")
      expect(requests()[0]).toMatchObject({
        method: "POST",
        body: { content: { raw: "Done" }, parent: { id: 3 } },
      })
    })

    it("resolves a thread and reopens it", async () => {
      const { provider, requests } = providerAnswering({
        "/resolve": new Response(null, { status: 204 }),
        "/comments?": threadComments,
      })
      await provider.threads.resolve("acme", "shop", 7, "3")
      await provider.threads.unresolve("acme", "shop", 7, "3")

      expect(requests().filter((request) => request.url.includes("/resolve")).map((request) => request.method)).toStrictEqual([
        "POST",
        "DELETE",
      ])
      expect(requests()[0]?.url).toContain("pullrequests/7/comments/3/resolve")
    })

    it("rejects a thread id that is not a comment id", async () => {
      const { provider } = providerAnswering({})
      const error = await provider.threads.reply("acme", "shop", 7, "abc", { body: "x" }).catch((cause: unknown) => cause)

      expect(error).toBeInstanceOf(GitAdapterError)
    })
  })
})
