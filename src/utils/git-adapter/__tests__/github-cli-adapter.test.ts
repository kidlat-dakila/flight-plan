import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { afterAll, describe, expect, it } from "vitest"
import { GithubCLIAdapter } from "../github-cli-adapter"
import { BaseGitAdapter } from "../base"

const run = promisify(execFile)
const roots: string[] = []

async function repositoryWithBranch(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-gh-adapter-"))
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

describe("GithubCLIAdapter", () => {
  it("is a BaseGitAdapter that adds the host capabilities", () => {
    const adapter = new GithubCLIAdapter()
    expect(adapter).toBeInstanceOf(BaseGitAdapter)
    expect(adapter.supports("list")).toBe(true)
    expect(adapter.supports("reviewers")).toBe(true)
  })

  it("answers branch refs with local git, never calling gh", async () => {
    const root = await repositoryWithBranch()
    const adapter = new GithubCLIAdapter({ root, repo: "acme/shop" })
    const ref = { kind: "branch", name: "topic" } as const

    expect((await adapter.target(ref))?.title).toBe("second")
    expect(await adapter.headSha(ref)).toMatch(/^[0-9a-f]{40}$/)
    expect(await adapter.diff(ref)).toContain("+b")
  })

  it("reads a file from local git when the commit is present", async () => {
    const root = await repositoryWithBranch()
    const adapter = new GithubCLIAdapter({ root, repo: "acme/shop" })
    expect(await adapter.blob("a.ts", "topic")).toBe("b\n")
  })
})
