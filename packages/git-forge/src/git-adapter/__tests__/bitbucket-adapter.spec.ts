import { describe, expect, it } from "vitest"
import { BaseGitAdapter } from "@/git-adapter/base"
import { BitbucketAdapter } from "@/git-adapter/bitbucket-adapter"
import { repositoryWithBranch } from "./repository-with-branch"

const neverCalled = async (): Promise<Response> => await Promise.reject(new Error("the network was used"))

describe("BitbucketAdapter", () => {
  it("is a BaseGitAdapter that adds the host capabilities on Cloud", () => {
    const adapter = new BitbucketAdapter({ username: "u", token: "t", repo: "acme/shop" })
    expect(adapter).toBeInstanceOf(BaseGitAdapter)
    expect(adapter.supports("list")).toBe(true)
    expect(adapter.supports("labels")).toBe(false)
  })

  it("answers branch refs and present commits with local git, not the network", async () => {
    const root = await repositoryWithBranch("flightplan-bitbucket-adapter-")
    const adapter = new BitbucketAdapter({
      username: "u",
      token: "t",
      root,
      repo: "acme/shop",
      fetcher: neverCalled,
    })
    const ref = { kind: "branch", name: "topic" } as const

    expect((await adapter.target(ref))?.title).toBe("second")
    expect(await adapter.diff(ref)).toContain("+b")
    expect(await adapter.blob("a.ts", "topic")).toBe("b\n")
  })

  it("reads a draft pull request as a draft", async () => {
    const adapter = new BitbucketAdapter({
      username: "u",
      token: "t",
      repo: "acme/shop",
      fetcher: async () =>
        await Promise.resolve(new Response(
          JSON.stringify({
            values: [
              {
                id: 5,
                title: "wip",
                draft: true,
                state: "OPEN",
                updated_on: "2026-01-01T00:00:00Z",
                author: { nickname: "ada" },
                source: { branch: { name: "feature/wip" } },
                links: { html: { href: "https://bitbucket.org/acme/shop/pull-requests/5" } },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )),
    })
    const [row] = await adapter.listTargets({})
    expect(row.isDraft).toBe(true)
    expect(row.author).toBe("ada")
    expect(row.headBranch).toBe("feature/wip")
  })
})
