import { describe, expect, it } from "vitest"
import { BaseGitAdapter } from "@/git-adapter/base"
import { GithubCLIAdapter } from "@/git-adapter/github-cli-adapter"
import { repositoryWithBranch } from "./repository-with-branch"

describe("GithubCLIAdapter", () => {
  it("is a BaseGitAdapter that adds the host capabilities", () => {
    const adapter = new GithubCLIAdapter()
    expect(adapter).toBeInstanceOf(BaseGitAdapter)
    expect(adapter.supports("list")).toBe(true)
    expect(adapter.supports("reviewers")).toBe(true)
  })

  it("answers branch refs with local git, never calling gh", async () => {
    const root = await repositoryWithBranch("flightplan-gh-adapter-")
    const adapter = new GithubCLIAdapter({ root, repo: "acme/shop" })
    const ref = { kind: "branch", name: "topic" } as const

    expect((await adapter.target(ref))?.title).toBe("second")
    expect(await adapter.headSha(ref)).toMatch(/^[0-9a-f]{40}$/)
    expect(await adapter.diff(ref)).toContain("+b")
  })

  it("reads a file from local git when the commit is present", async () => {
    const root = await repositoryWithBranch("flightplan-gh-adapter-")
    const adapter = new GithubCLIAdapter({ root, repo: "acme/shop" })
    expect(await adapter.blob("a.ts", "topic")).toBe("b\n")
  })
})
