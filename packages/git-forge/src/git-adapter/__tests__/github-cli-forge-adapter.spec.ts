import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { afterAll, describe, expect, it } from "vitest"
import { GithubCLIAdapter } from "@/git-adapter/github-cli-adapter"
import { GitAdapterError } from "@/git-adapter/types"

const run = promisify(execFile)
const SHA = "0123456789abcdef0123456789abcdef01234567"
const JSON_HEAD = "HTTP/2.0 200 OK\r\nContent-Type: application/json; charset=utf-8\r\n\r\n"
const NOT_FOUND
  = "HTTP/2.0 404 Not Found\r\nContent-Type: application/json\r\n\r\n{\"message\":\"Not Found\"}"

const FAKE_GH = `#!/bin/sh
echo "$*" >> "$FAKE_GH_DIR/calls.log"
case "$*" in
  *graphql*) cat "$FAKE_GH_DIR/graphql.http" ;;
  *" user") cat "$FAKE_GH_DIR/user.http" ;;
  *search/issues*) cat "$FAKE_GH_DIR/search.http" ;;
  *pulls?state=open*) cat "$FAKE_GH_DIR/list.http" ;;
  *requested_reviewers*) cat "$FAKE_GH_DIR/requested.http" ;;
  *pulls/7/reviews*) cat "$FAKE_GH_DIR/reviews.http" ;;
  *labels*) cat "$FAKE_GH_DIR/labels.http" ;;
  *compare/*) cat "$FAKE_GH_DIR/compare.http" ;;
  *github.v3.diff*) cat "$FAKE_GH_DIR/diff.http" ;;
  *pulls/7*) cat "$FAKE_GH_DIR/pull.http" ;;
  *contents/a.ts*) cat "$FAKE_GH_DIR/contents.http" ;;
  *) cat "$FAKE_GH_DIR/missing.http"; exit 1 ;;
esac
`

const userOf = (login: string) => ({ login, id: 1, avatar_url: "", html_url: "" })

const pullRequest = (number: number, extra: object = {}) => ({
  id: number,
  number,
  title: `PR ${String(number)}`,
  body: "",
  state: "open",
  labels: [],
  user: userOf("ada"),
  assignees: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  html_url: `https://github.com/acme/shop/pull/${String(number)}`,
  draft: false,
  merged_at: null,
  ...extra,
})

const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-fake-gh-"))
const bin = path.join(scratch, "bin")
const environment = {
  PATH: [bin, "/usr/bin", "/bin"].join(path.delimiter),
  FAKE_GH_DIR: scratch,
}

async function readCalls(): Promise<string[]> {
  const log = await fs.readFile(path.join(scratch, "calls.log"), "utf8").catch(() => "")
  return log.split("\n").filter((line) => line !== "")
}

async function emptyRepository(): Promise<string> {
  const root = path.join(scratch, "repo")
  await fs.mkdir(root, { recursive: true })
  await run("git", ["init", "-q", "-b", "main"], { cwd: root })
  return root
}

await fs.mkdir(bin)
await fs.writeFile(path.join(bin, "gh"), FAKE_GH, { mode: 0o755 })
await fs.writeFile(
  path.join(scratch, "search.http"),
  JSON_HEAD
  + JSON.stringify({
    incomplete_results: false,
    items: [
      pullRequest(11, {
        pull_request: { url: "x" },
        repository_url: "https://api.github.com/repos/acme/shop",
      }),
    ],
  }),
)
await fs.writeFile(
  path.join(scratch, "pull.http"),
  JSON_HEAD
  + JSON.stringify(
    pullRequest(7, {
      head: { sha: SHA, ref: "topic" },
      base: { sha: "b".repeat(40), ref: "main" },
      merged: false,
      mergeable: true,
      mergeable_state: "clean",
    }),
  ),
)
await fs.writeFile(
  path.join(scratch, "contents.http"),
  JSON_HEAD
  + JSON.stringify({
    type: "file",
    encoding: "base64",
    size: 4,
    sha: SHA,
    path: "a.ts",
    content: Buffer.from("hey\n").toString("base64"),
  }),
)
const pull7 = pullRequest(7, {
  head: { sha: SHA, ref: "topic" },
  base: { sha: "b".repeat(40), ref: "main" },
})
await fs.writeFile(path.join(scratch, "list.http"), JSON_HEAD + JSON.stringify([pull7]))
await fs.writeFile(
  path.join(scratch, "labels.http"),
  JSON_HEAD + JSON.stringify([{ name: "docs" }, { name: "bug" }]),
)
await fs.writeFile(
  path.join(scratch, "reviews.http"),
  JSON_HEAD
  + JSON.stringify([
    { user: userOf("bo"), state: "CHANGES_REQUESTED" },
    { user: userOf("bo"), state: "APPROVED" },
  ]),
)
await fs.writeFile(
  path.join(scratch, "requested.http"),
  JSON_HEAD + JSON.stringify({ users: [userOf("cy")] }),
)
await fs.writeFile(
  path.join(scratch, "compare.http"),
  JSON_HEAD
  + JSON.stringify({
    total_commits: 2,
    files: [{ filename: "a.ts", status: "modified", patch: "@@ -1 +1 @@\n-a\n+b" }],
  }),
)
await fs.writeFile(
  path.join(scratch, "diff.http"),
  "HTTP/2.0 200 OK\r\nContent-Type: application/vnd.github.v3.diff\r\n\r\ndiff --git a/a.ts b/a.ts\n",
)
await fs.writeFile(path.join(scratch, "missing.http"), NOT_FOUND)
await fs.writeFile(
  path.join(scratch, "user.http"),
  JSON_HEAD + JSON.stringify({ login: "dev", name: "Dev Harper", avatar_url: "https://avatars.test/dev.png" }),
)
await fs.writeFile(
  path.join(scratch, "graphql.http"),
  JSON_HEAD
  + JSON.stringify({
    data: {
      a0: {
        nodes: [
          {
            number: 12,
            title: "Retry webhooks",
            state: "MERGED",
            isDraft: false,
            createdAt: "2026-10-01T08:00:00Z",
            updatedAt: "2026-10-01T09:00:00Z",
            headRefName: "fix/webhook-retry",
            author: { login: "mira", avatarUrl: "https://avatars.test/mira.png" },
            reviewRequests: { nodes: [] },
            reviews: { nodes: [] },
            comments: { nodes: [] },
            reviewThreads: { nodes: [] },
            commits: { nodes: [] },
          },
        ],
      },
    },
  }),
)

afterAll(async () => {
  await fs.rm(scratch, { recursive: true, force: true })
})

describe("the GitHub CLI as a forges provider", () => {
  it("reads a pull request's head commit through gh api", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })
    expect(await adapter.headSha({ kind: "pr", number: 7 })).toBe(SHA)
    expect((await readCalls()).some((call) => call.includes("repos/acme/shop/pulls/7"))).toBe(true)
  })

  it("reads a file that is not in the checkout through gh api", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })
    expect(await adapter.blob("a.ts", SHA)).toBe("hey\n")
  })

  it("lists pull requests with one search, newest first, keeping the qualifiers", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })
    const rows = await adapter.listTargets({
      includeMine: false,
      filter: { review: ["awaiting-me"], labels: ["bug"] },
    })

    expect(rows.map((row) => row.title)).toStrictEqual(["PR 11"])
    expect(rows[0]?.author).toBe("ada")
    const search = (await readCalls()).find((call) => call.includes("search/issues")) ?? ""
    expect(decodeURIComponent(search.replace(/\+/g, " "))).toContain(
      "user-review-requested:@me label:\"bug\" sort:updated-desc repo:acme/shop is:pr is:open",
    )
  })

  it("maps a 404 from the host to a no-repo problem", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })
    const error = await adapter.headSha({ kind: "pr", number: 99 }).catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(GitAdapterError)
    expect(error).toMatchObject({ problem: "no-repo" })
  })

  it("reads a pull request with its base branch and sha, for stacked pull requests", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })
    const row = await adapter.target({ kind: "pr", number: 7 })

    expect(row?.baseRef).toBe("main")
    expect(row?.baseSha).toBe("b".repeat(40))
    expect(row?.isDraft).toBe(false)
  })

  it("lists open pull requests from the plain list when nothing filters them", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })
    const rows = await adapter.listTargets({ includeMine: false })

    expect(rows.map((row) => row.baseRef)).toStrictEqual(["main"])
    expect((await readCalls()).some((call) => call.includes("sort=updated"))).toBe(true)
  })

  it("lists labels sorted", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })
    expect(await adapter.listLabels()).toStrictEqual(["bug", "docs"])
  })

  it("reports the latest review per person with requested reviewers pending", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })
    const summary = await adapter.reviewers({ kind: "pr", number: 7 })

    expect(summary.author.login).toBe("ada")
    expect(summary.reviewers.map((one) => [one.login, one.state])).toStrictEqual([
      ["bo", "approved"],
      ["cy", "pending"],
    ])
  })

  it("reads a pull request diff as text by media type", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })
    expect(await adapter.diff({ kind: "pr", number: 7 })).toContain("diff --git a/a.ts")
  })

  it("compares commits the checkout does not have, with patches", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })
    const comparison = await adapter.compare(SHA, "f".repeat(40))

    expect(comparison.commits).toBe(2)
    expect(comparison.files[0]?.patch).toContain("+b")
  })

  it("falls back to the checkout's remote when no repository is named", async () => {
    const root = await emptyRepository()
    await run("git", ["remote", "add", "origin", "https://github.com/acme/shop.git"], { cwd: root })
    const adapter = new GithubCLIAdapter({ root, environment })
    expect(await adapter.headSha({ kind: "pr", number: 7 })).toBe(SHA)
  })

  it("reads the signed-in user through gh api", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })

    await expect(adapter.viewer()).resolves.toStrictEqual({
      login: "dev",
      name: "Dev Harper",
      avatarUrl: "https://avatars.test/dev.png",
    })
  })

  it("reads pull request history with one GraphQL call that gh sends as a form field", async () => {
    const adapter = new GithubCLIAdapter({ root: await emptyRepository(), repo: "acme/shop", environment })

    await expect(adapter.listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toMatchObject([
      { number: 12, state: "merged", headBranch: "fix/webhook-retry", author: { login: "mira" } },
    ])
    const calls = (await readCalls()).join("\n")
    expect(calls).toContain("-f query=")
    expect(calls).toContain("author:mira")
  })
})
