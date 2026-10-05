import { afterEach, describe, expect, it, vi } from "vitest"
import { BaseGitAdapter } from "@/git-adapter/base"
import { GitlabAdapter } from "@/git-adapter/gitlab-adapter"
import { repositoryWithBranch } from "./repository-with-branch"

afterEach(() => {
  vi.unstubAllGlobals()
})

const neverCalled = async (): Promise<Response> => await Promise.reject(new Error("the network was used"))

describe("GitlabAdapter", () => {
  it("is a BaseGitAdapter that adds the host capabilities", () => {
    const adapter = new GitlabAdapter({ token: "t" })
    expect(adapter).toBeInstanceOf(BaseGitAdapter)
    expect(adapter.supports("list")).toBe(true)
    expect(adapter.supports("reviewers")).toBe(true)
  })

  it("answers branch refs and present commits with local git, not the network", async () => {
    vi.stubGlobal("fetch", neverCalled)
    const root = await repositoryWithBranch("flightplan-gitlab-adapter-")
    const adapter = new GitlabAdapter({
      token: "t",
      root,
      repo: "group/project",
    })
    const ref = { kind: "branch", name: "topic" } as const

    expect((await adapter.target(ref))?.title).toBe("second")
    expect(await adapter.diff(ref)).toContain("+b")
    expect(await adapter.blob("a.ts", "topic")).toBe("b\n")
  })

  it("reads the head commit and missing blobs through the forges library", async () => {
    const json = (body: unknown): Response =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    const answer = (input: string | URL | Request): Response => {
      const url = String(input instanceof Request ? input.url : input)
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
    }
    const fetcher = vi.fn(async (input: string | URL | Request) => await Promise.resolve(answer(input)))
    vi.stubGlobal("fetch", fetcher)
    const root = await repositoryWithBranch("flightplan-gitlab-adapter-")
    const adapter = new GitlabAdapter({ token: "t", root, repo: "group/project" })

    expect(await adapter.headSha({ kind: "pr", number: 7 })).toBe("abc1234def5678")
    expect(await adapter.blob("a.ts", "0123456789abcdef0123456789abcdef01234567")).toBe("hey\n")
    expect(fetcher).toHaveBeenCalled()
  })
})
