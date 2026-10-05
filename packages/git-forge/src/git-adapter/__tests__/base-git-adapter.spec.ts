import * as assert from "node:assert"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { onTestFinished } from "vitest"
import { BaseGitAdapter, oldestDate, parseBranchTips } from "@/utils/git-adapter/base"
import { GitAdapterError, type GitAdapter } from "@/utils/git-adapter/types"

const run = promisify(execFile)

async function repository(): Promise<{ root: string, gitAdapter: GitAdapter }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-git-"))
  const at = async (args: string[]) => run("git", args, { cwd: root })

  await at(["init", "-q", "-b", "main"])
  await at(["config", "user.email", "nobody@example.com"])
  await at(["config", "user.name", "Nobody"])

  await fs.writeFile(path.join(root, "placeOrder.ts"), "export function placeOrder() {}\n")
  await at(["add", "."])
  await at(["commit", "-qm", "feat: place an order"])

  await at(["checkout", "-q", "-b", "stock-check"])
  await fs.writeFile(
    path.join(root, "placeOrder.ts"),
    "export function placeOrder() {\n  return hasStock()\n}\n",
  )
  await fs.writeFile(path.join(root, "hasStock.ts"), "export function hasStock() {}\n")
  await at(["add", "."])
  await at(["commit", "-qm", "feat: refuse an order with no stock"])
  await at(["checkout", "-q", "main"])

  return { root, gitAdapter: new BaseGitAdapter({ root, repo: "acme/storefront" }) }
}

suite("the git adapter", () => {
  async function fresh(): Promise<{ root: string, gitAdapter: GitAdapter }> {
    const built = await repository()
    onTestFinished(async () => {
      await fs.rm(built.root, { recursive: true, force: true })
    })
    return built
  }

  it("declares only what git can actually answer", async () => {
    const { gitAdapter } = await fresh()
    for (const can of ["blob", "compare", "headSha", "diff", "branches"] as const) {
      assert.ok(gitAdapter.supports(can), `${can} should be supported`)
    }
    for (const cannot of ["list", "labels", "filters", "permalink", "history"] as const) {
      assert.ok(!gitAdapter.supports(cannot), `${cannot} should not be supported`)
    }
  })

  it("what it cannot do is refused by name, not answered emptily", async () => {
    const { gitAdapter } = await fresh()
    const ref = { kind: "branch", name: "stock-check" } as const

    const refusals: [string, () => Promise<unknown>][] = [
      ["listLabels", async () => await gitAdapter.listLabels()],
      ["reviewers", async () => await gitAdapter.reviewers(ref)],
      ["viewer", async () => await gitAdapter.viewer()],
      ["listPullRequests", async () => await gitAdapter.listPullRequests({ authors: [], limit: 1 })],
      ["permalink", async () => await Promise.resolve().then(() => gitAdapter.permalink(ref, "placeOrder.ts"))],
    ]

    await Promise.all(
      refusals.map(async ([name, call]) => {
        await assert.rejects(
          call,
          (cause: unknown) =>
            cause instanceof GitAdapterError
            && cause.problem === "unsupported"
            && cause.message.startsWith("git cannot "),
          `${name} did not refuse by name`,
        )
      }),
    )
  })

  it("a pull request ref is refused: git has no pull requests", async () => {
    const { gitAdapter } = await fresh()
    await assert.rejects(
      async () => gitAdapter.headSha({ kind: "pr", number: 1 }),
      (cause: unknown) =>
        cause instanceof GitAdapterError && cause.problem === "unsupported",
    )
  })

  it("a branch row carries its last commit as a title", async () => {
    const { gitAdapter } = await fresh()
    const row = await gitAdapter.target({ kind: "branch", name: "stock-check" })
    assert.strictEqual(row?.title, "feat: refuse an order with no stock")
    assert.strictEqual(row.author, "Nobody")
    assert.strictEqual(row.reason, "added")

    assert.strictEqual(row.url, "")
    assert.ok(row.updatedAt !== "")
  })

  it("a branch that does not exist is null, not an exception", async () => {
    const { gitAdapter } = await fresh()
    assert.strictEqual(await gitAdapter.target({ kind: "branch", name: "nope" }), null)
  })

  it("the list is exactly the branches that were added, in order", async () => {
    const { gitAdapter } = await fresh()
    const rows = await gitAdapter.listTargets({
      pinned: [
        { kind: "branch", name: "stock-check" },
        { kind: "branch", name: "nope" },
      ],
    })
    assert.deepStrictEqual(
      rows.map((row) => row.ref),
      [{ kind: "branch", name: "stock-check" }],
    )
  })

  it("nothing added means an empty list rather than every local branch", async () => {
    const { gitAdapter } = await fresh()
    assert.deepStrictEqual(await gitAdapter.listTargets({}), [])
  })

  it("a branch head resolves to a full commit id", async () => {
    const { root, gitAdapter } = await fresh()
    const sha = await gitAdapter.headSha({ kind: "branch", name: "stock-check" })
    const { stdout } = await run("git", ["rev-parse", "stock-check"], { cwd: root })
    assert.strictEqual(sha, stdout.trim())
    assert.strictEqual(sha.length, 40)
  })

  it("the diff of a branch is its own work against trunk", async () => {
    const { gitAdapter } = await fresh()
    const diff = await gitAdapter.diff({ kind: "branch", name: "stock-check" })
    assert.ok(diff.includes("hasStock.ts"))
    assert.ok(diff.includes("+  return hasStock()"))

    assert.ok(!diff.includes("new file mode 100644\nindex 0000000..0000000"))
  })

  it("a comparison reports files and how many commits apart they are", async () => {
    const { gitAdapter } = await fresh()
    const comparison = await gitAdapter.compare("main", "stock-check")
    assert.strictEqual(comparison.commits, 1)
    assert.deepStrictEqual(
      comparison.files.map((file) => file.path).sort(),
      ["hasStock.ts", "placeOrder.ts"],
    )
    const added = comparison.files.find((file) => file.path === "hasStock.ts")
    assert.strictEqual(added?.status, "added")
  })

  it("a file is read at the commit asked for, not from the working tree", async () => {
    const { root, gitAdapter } = await fresh()
    const onBranch = await gitAdapter.blob("placeOrder.ts", "stock-check")
    assert.ok(onBranch.includes("return hasStock()"))

    const onTrunk = await gitAdapter.blob("placeOrder.ts", "main")
    assert.ok(!onTrunk.includes("return hasStock()"))

    const { stdout } = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: root,
    })
    assert.strictEqual(stdout.trim(), "main")
  })

  it("a file that is not in that commit fails as no-repo, not as raw stderr", async () => {
    const { gitAdapter } = await fresh()
    await assert.rejects(
      async () => gitAdapter.blob("hasStock.ts", "main"),
      (cause: unknown) =>
        cause instanceof GitAdapterError
        && cause.problem === "no-repo"
        && cause.message.includes("hasStock.ts"),
    )
  })

  it("comparing against a commit that is not fetched says so", async () => {
    const { gitAdapter } = await fresh()
    await assert.rejects(
      async () => gitAdapter.compare("main", "0000000000000000000000000000000000000000"),
      (cause: unknown) =>
        cause instanceof GitAdapterError && cause.problem === "no-repo",
    )
  })

  it("lists the branches that are not merged into the default branch", async () => {
    const { gitAdapter } = await fresh()

    const branches = await gitAdapter.listBranches()

    expect(branches).toHaveLength(1)
    expect(branches[0]).toMatchObject({ name: "stock-check", authorEmail: "nobody@example.com" })
    expect(branches[0].sha).toMatch(/^[0-9a-f]{40}$/)
  })

  it("dates the start of a branch by its oldest commit that the default branch lacks", async () => {
    const { gitAdapter } = await fresh()
    const [tip] = await gitAdapter.listBranches()

    await expect(gitAdapter.branchStart("stock-check")).resolves.toBe(tip.updatedAt)
  })

  it("has no start for a branch that does not exist", async () => {
    const { gitAdapter } = await fresh()

    await expect(gitAdapter.branchStart("nowhere")).resolves.toBeNull()
  })

  it("fetches without a remote to fetch from", async () => {
    const { gitAdapter } = await fresh()

    await expect(gitAdapter.fetchRemotes()).resolves.toBeUndefined()
  })
})

const refLine = (refName: string, sha: string, email: string, date: string): string =>
  [refName, sha, email, date].join("\u001F")

describe("parseBranchTips", () => {
  it("reads a local branch and a remote-tracking branch", () => {
    const tips = parseBranchTips(
      [
        refLine("refs/heads/feature/a", "a1", "<Mira@Acme.test>", "2026-10-01T10:00:00+00:00"),
        refLine("refs/remotes/origin/feature/b", "b1", "<teo@acme.test>", "2026-10-01T09:00:00+00:00"),
      ].join("\n"),
      "main",
    )

    expect(tips).toStrictEqual([
      { name: "feature/a", sha: "a1", authorEmail: "mira@acme.test", updatedAt: "2026-10-01T10:00:00.000Z" },
      { name: "feature/b", sha: "b1", authorEmail: "teo@acme.test", updatedAt: "2026-10-01T09:00:00.000Z" },
    ])
  })

  it("keeps the newer tip when a branch exists locally and on the remote", () => {
    const tips = parseBranchTips(
      [
        refLine("refs/heads/work", "old", "<a@acme.test>", "2026-10-01T08:00:00+00:00"),
        refLine("refs/remotes/origin/work", "new", "<a@acme.test>", "2026-10-01T09:00:00+00:00"),
      ].join("\n"),
      "main",
    )

    expect(tips).toMatchObject([{ name: "work", sha: "new" }])
  })

  it("prefers the local branch when both tips are the same age", () => {
    const tips = parseBranchTips(
      [
        refLine("refs/remotes/origin/work", "remote", "<a@acme.test>", "2026-10-01T09:00:00+00:00"),
        refLine("refs/heads/work", "local", "<a@acme.test>", "2026-10-01T09:00:00+00:00"),
      ].join("\n"),
      "main",
    )

    expect(tips).toMatchObject([{ sha: "local" }])
  })

  it("leaves out the default branch, the remote HEAD and unreadable lines", () => {
    const tips = parseBranchTips(
      [
        refLine("refs/heads/main", "m1", "<a@acme.test>", "2026-10-01T09:00:00+00:00"),
        refLine("refs/remotes/origin/main", "m1", "<a@acme.test>", "2026-10-01T09:00:00+00:00"),
        refLine("refs/remotes/origin/HEAD", "m1", "<a@acme.test>", "2026-10-01T09:00:00+00:00"),
        refLine("refs/tags/v1", "t1", "<a@acme.test>", "2026-10-01T09:00:00+00:00"),
        "garbage",
        "",
      ].join("\n"),
      "main",
    )

    expect(tips).toStrictEqual([])
  })

  it("sorts the newest tip first", () => {
    const tips = parseBranchTips(
      [
        refLine("refs/heads/older", "o1", "<a@acme.test>", "2026-10-01T08:00:00+00:00"),
        refLine("refs/heads/newer", "n1", "<a@acme.test>", "2026-10-01T09:00:00+00:00"),
      ].join("\n"),
      null,
    )

    expect(tips.map((tip) => tip.name)).toStrictEqual(["newer", "older"])
  })
})

describe("oldestDate", () => {
  it("reads the oldest commit date", () => {
    expect(oldestDate("2026-10-03T10:00:00+00:00\n2026-10-02T10:00:00+00:00\n2026-10-01T10:00:00+00:00\n")).toBe(
      "2026-10-01T10:00:00.000Z",
    )
  })

  it("reports null when there are no commits", () => {
    expect(oldestDate("\n")).toBeNull()
  })
})
