import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { afterAll, describe, expect, it } from "vitest"
import { GitlabCLIAdapter } from "@/git-adapter/gitlab-cli-adapter"

const run = promisify(execFile)
const JSON_HEAD = "HTTP/2.0 200 OK\r\nContent-Type: application/json\r\n\r\n"
const UNAUTHORIZED = "HTTP/2.0 401 Unauthorized\r\nContent-Type: application/json\r\n\r\n{\"message\":\"401 Unauthorized\"}"

const FAKE_GLAB = `#!/bin/sh
echo "$*" >> "$FAKE_GLAB_DIR/calls.log"
case "$*" in
  *" user") cat "$FAKE_GLAB_DIR/user.http" ;;
  *" graphql") cat "$FAKE_GLAB_DIR/graphql.http" ;;
  *members/all*) cat "$FAKE_GLAB_DIR/members.http" ;;
  *merge_requests/99*) cat "$FAKE_GLAB_DIR/unauthorized.http"; exit 1 ;;
  *merge_requests/5/notes*) cat "$FAKE_GLAB_DIR/notes.http" ;;
  *merge_requests/5/commits*) cat "$FAKE_GLAB_DIR/commits.http" ;;
  *merge_requests*) cat "$FAKE_GLAB_DIR/merge-requests.http" ;;
  *) cat "$FAKE_GLAB_DIR/unauthorized.http"; exit 1 ;;
esac
`

const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-fake-glab-"))
const bin = path.join(scratch, "bin")
const environment = {
  PATH: [bin, "/usr/bin", "/bin"].join(path.delimiter),
  FAKE_GLAB_DIR: scratch,
}

const mergeRequest = {
  iid: 5,
  title: "Retry webhooks",
  state: "opened",
  draft: false,
  source_branch: "fix/webhook-retry",
  created_at: "2026-10-01T08:00:00Z",
  updated_at: "2026-10-01T09:00:00Z",
  web_url: "https://gitlab.acme.test/platform/ledger/-/merge_requests/5",
  author: { username: "mira", name: "Mira Sandoval", avatar_url: "/uploads/mira.png" },
  reviewers: [{ username: "teo" }],
}

const writeResponses = async (): Promise<void> => {
  await fs.mkdir(bin, { recursive: true })
  await fs.writeFile(path.join(bin, "glab"), FAKE_GLAB, { mode: 0o755 })
  await Promise.all(
    Object.entries({
      "user.http": { username: "dev", name: "Dev Harper", avatar_url: "https://avatars.test/dev.png" },
      "members.http": [{ username: "lena", name: "Lena Okafor" }],
      "notes.http": [{ author: { username: "dev" }, created_at: "2026-10-01T10:00:00Z", system: false, body: "Looks odd" }],
      "commits.http": [{ committed_date: "2026-10-01T07:00:00Z" }],
      "merge-requests.http": [mergeRequest],
      "graphql.http": { data: { mergeRequestRequestChanges: { errors: [] } } },
    }).map(async ([name, body]) => { await fs.writeFile(path.join(scratch, name), JSON_HEAD + JSON.stringify(body)) }),
  )
  await fs.writeFile(path.join(scratch, "unauthorized.http"), UNAUTHORIZED)
}

await writeResponses()

afterAll(async () => {
  await fs.rm(scratch, { recursive: true, force: true })
})

const readCalls = async (): Promise<string[]> => {
  const log = await fs.readFile(path.join(scratch, "calls.log"), "utf8").catch(() => "")
  return log.split("\n").filter((line) => line !== "")
}

const emptyRepository = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(scratch, "repo-"))
  await run("git", ["init", "-q", "-b", "main"], { cwd: root })
  return root
}

const adapterOn = async (overrides: { environment?: Record<string, string> } = {}): Promise<GitlabCLIAdapter> =>
  new GitlabCLIAdapter({
    root: await emptyRepository(),
    repo: "platform/ledger",
    baseUrl: "https://gitlab.acme.test",
    environment,
    ...overrides,
  })

describe("GitlabCLIAdapter", () => {
  it("is the glab adapter and declares the host capabilities", async () => {
    const adapter = await adapterOn()

    expect(adapter.id).toBe("glab")
    expect(adapter.name).toBe("the GitLab CLI")
    expect(adapter.supports("history")).toBe(true)
    expect(adapter.supports("people")).toBe(true)
  })

  it("requests changes through glab's own GraphQL address, as a query field", async () => {
    const adapter = await adapterOn()

    await adapter.submitReview({ kind: "pr", number: 5 }, { verdict: "request-changes", body: "", commitSha: "abc1234", comments: [] })

    const calls = (await readCalls()).join("\n")
    expect(calls).toContain("api -i -f query=mutation {")
    expect(calls).toContain("mergeRequestRequestChanges(input: { projectPath: \"platform/ledger\", iid: \"5\" })")
    expect(calls.trimEnd().endsWith(" graphql")).toBe(true)
  })

  it("reads the signed-in user through glab api, with the response headers included", async () => {
    const adapter = await adapterOn()

    await expect(adapter.viewer()).resolves.toStrictEqual({
      login: "dev",
      name: "Dev Harper",
      avatarUrl: "https://avatars.test/dev.png",
    })
    expect((await readCalls()).at(-1)).toBe("api -i user")
  })

  it("reads merge request history with the notes and commits of an open merge request", async () => {
    const adapter = await adapterOn()

    await expect(adapter.listPullRequests({ authors: ["mira"], limit: 15 })).resolves.toStrictEqual([
      {
        number: 5,
        title: "Retry webhooks",
        headBranch: "fix/webhook-retry",
        state: "open",
        isDraft: false,
        author: { login: "mira", name: "Mira Sandoval", avatarUrl: "https://gitlab.acme.test/uploads/mira.png" },
        createdAt: "2026-10-01T08:00:00Z",
        updatedAt: "2026-10-01T09:00:00Z",
        requestedReviewers: ["teo"],
        discussion: [{ login: "dev", at: "2026-10-01T10:00:00Z" }],
        commitDates: ["2026-10-01T07:00:00Z"],
      },
    ])
    const listing = (await readCalls()).find((call) => call.includes("author_username=mira")) ?? ""
    expect(listing).toContain("api -i projects/platform%2Fledger/merge_requests?")
  })

  it("searches the project's members and the recent merge request authors", async () => {
    const adapter = await adapterOn()

    await expect(adapter.searchPeople("")).resolves.toStrictEqual([
      { login: "lena", name: "Lena Okafor", avatarUrl: "" },
      { login: "mira", name: "Mira Sandoval", avatarUrl: "https://gitlab.acme.test/uploads/mira.png" },
    ])
  })

  it("reports a missing glab as the no-cli problem", async () => {
    const adapter = await adapterOn({ environment: { PATH: "/nonexistent" } })

    await expect(adapter.viewer()).rejects.toMatchObject({ problem: "no-cli", message: "The GitLab CLI is not installed here." })
  })

  it("reports a refused request as the auth problem", async () => {
    const adapter = await adapterOn()

    await expect(adapter.headSha({ kind: "pr", number: 99 })).rejects.toMatchObject({ problem: "auth" })
  })
})
