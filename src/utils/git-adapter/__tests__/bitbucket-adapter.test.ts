import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { afterAll, describe, expect, it } from "vitest"
import { BaseGitAdapter } from "../base"
import { BitbucketAdapter } from "../bitbucket-adapter"

const run = promisify(execFile)
const roots: string[] = []

const neverCalled = () => Promise.reject(new Error("the network was used"))

async function repositoryWithBranch(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-bitbucket-adapter-"))
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

describe("BitbucketAdapter", () => {
  it("is a BaseGitAdapter that adds the host capabilities on Cloud", () => {
    const adapter = new BitbucketAdapter({ username: "u", token: "t", repo: "acme/shop" })
    expect(adapter).toBeInstanceOf(BaseGitAdapter)
    expect(adapter.supports("list")).toBe(true)
    expect(adapter.supports("labels")).toBe(false)
  })

  it("answers branch refs and present commits with local git, not the network", async () => {
    const root = await repositoryWithBranch()
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
        new Response(
          JSON.stringify({
            values: [
              {
                id: 5,
                title: "wip",
                draft: true,
                state: "OPEN",
                updated_on: "2026-01-01T00:00:00Z",
                author: { nickname: "ada" },
                links: { html: { href: "https://bitbucket.org/acme/shop/pull-requests/5" } },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    })
    const [row] = await adapter.listTargets({})
    expect(row?.isDraft).toBe(true)
    expect(row?.author).toBe("ada")
  })
})
