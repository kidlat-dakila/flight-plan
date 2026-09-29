import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { afterAll, describe, expect, it, vi } from "vitest"
import { BaseGitAdapter } from "../base"
import { GitlabAdapter } from "../gitlab-adapter"

const run = promisify(execFile)
const roots: string[] = []

const neverCalled = () => Promise.reject(new Error("the network was used"))

async function repositoryWithBranch(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-gitlab-adapter-"))
  roots.push(root)
  const at = (args: string[]) => run("git", args, { cwd: root })
  await at(["init", "-q", "-b", "main"])
  await at(["config", "user.email", "nobody@example.com"])
  await at(["config", "user.name", "Nobody"])
  await fs.writeFile(path.join(root, "a.ts"), "a\n")
  await at(["add", "."])
  await at(["commit", "-qm", "first"])
  await at(["checkout", "-q", "-b", "topic"])
  await fs.writeFile(path.join(root, "a.ts"), "b\n")
  await at(["commit", "-qam", "second"])
  await at(["checkout", "-q", "main"])
  return root
}

afterAll(async () => {
  await Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true })))
})

describe("GitlabAdapter", () => {
  it("is a BaseGitAdapter that adds the host capabilities", () => {
    const adapter = new GitlabAdapter({ token: "t" })
    expect(adapter).toBeInstanceOf(BaseGitAdapter)
    expect(adapter.supports("list")).toBe(true)
    expect(adapter.supports("reviewers")).toBe(true)
  })

  it("answers branch refs and present commits with local git, not the network", async () => {
    const root = await repositoryWithBranch()
    const adapter = new GitlabAdapter({
      token: "t",
      root,
      repo: "group/project",
      fetcher: neverCalled,
    })
    const ref = { kind: "branch", name: "topic" } as const

    expect((await adapter.target(ref))?.title).toBe("second")
    expect(await adapter.diff(ref)).toContain("+b")
    expect(await adapter.blob("a.ts", "topic")).toBe("b\n")
  })

  it("reads the head commit and missing blobs through the forges library", async () => {
    const requested: string[] = []
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input)
      requested.push(url)
      if (url.includes("/merge_requests/7")) {
        return json({
          iid: 7,
          id: 1,
          title: "t",
          description: "",
          state: "opened",
          sha: "abc1234def5678",
          labels: [],
          author: { username: "ada" },
          assignees: [],
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
          web_url: "https://gitlab.com/group/project/-/merge_requests/7",
          source_branch: "topic",
          target_branch: "main",
        })
      }
      if (url.endsWith("/projects/group%2Fproject")) return json({ id: 42, path_with_namespace: "group/project" })
      if (url.includes("/repository/files/")) {
        return json({
          file_name: "a.ts",
          file_path: "a.ts",
          size: 4,
          encoding: "base64",
          content: Buffer.from("hey\n").toString("base64"),
          commit_id: "0123456789abcdef0123456789abcdef01234567",
        })
      }
      return json({})
    })
    const root = await repositoryWithBranch()
    const adapter = new GitlabAdapter({ token: "t", root, repo: "group/project" })

    expect(await adapter.headSha({ kind: "pr", number: 7 })).toBe("abc1234def5678")
    expect(await adapter.blob("a.ts", "0123456789abcdef0123456789abcdef01234567")).toBe("hey\n")
    expect(requested.length).toBeGreaterThan(0)
    vi.unstubAllGlobals()
  })
})
