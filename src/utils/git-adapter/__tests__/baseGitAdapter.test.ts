import * as assert from "assert"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { BaseGitAdapter } from "../base"
import { GitAdapterError, type GitAdapter } from "../../../lib/git-adapter/types"

const run = promisify(execFile)

/**
 * A real repository, because this adapter is a wrapper around real git.
 *
 * Stubbing `execFile` here would test the argument strings and nothing else,
 * and the argument strings are the part least likely to be wrong. What is worth
 * proving is that `main...branch` means what we think it means, that a branch
 * reachable only as `origin/x` still resolves, and that a missing commit fails
 * as a `no-repo` rather than as a raw stderr dump.
 */
async function repository(): Promise<{ root: string; gitAdapter: GitAdapter }> {
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
  const made: string[] = []

  async function fresh() {
    const built = await repository()
    made.push(built.root)
    return built
  }

  afterAll(async () => {
    await Promise.all(
      made.map(async (root) => fs.rm(root, { recursive: true, force: true })),
    )
  })

  test("it declares only what git can actually answer", async () => {
    const { gitAdapter } = await fresh()
    for (const can of ["blob", "compare", "headSha", "diff"] as const) {
      assert.ok(gitAdapter.supports(can), `${can} should be supported`)
    }
    for (const cannot of ["list", "labels", "filters", "permalink"] as const) {
      assert.ok(!gitAdapter.supports(cannot), `${cannot} should not be supported`)
    }
  })

  /*
   * The refusals are the point of the capability set, so they are checked
   * rather than assumed. A caller that consults `supports` never reaches these;
   * one that forgets gets a named problem instead of a plausible empty answer.
   *
   * Both throw synchronously, including the one that is typed as returning a
   * promise. That is deliberate and worth pinning: a rejected
   * promise here would be swallowed by any caller that forgot to await, and an
   * unsupported call would then look like an empty result.
   */
  test("what it cannot do is refused by name, not answered emptily", async () => {
    const { gitAdapter } = await fresh()
    const ref = { kind: "branch", name: "stock-check" } as const

    const refusals: [string, () => unknown][] = [
      ["listLabels", () => gitAdapter.listLabels()],
      ["permalink", () => gitAdapter.permalink(ref, "placeOrder.ts")],
    ]

    for (const [name, call] of refusals) {
      let thrown: unknown = null
      try {
        call()
      } catch (cause) {
        thrown = cause
      }
      assert.ok(thrown instanceof GitAdapterError, `${name} did not throw a GitAdapterError`)
      assert.strictEqual(thrown.problem, "unsupported", `${name} had the wrong problem`)
      // Names itself, so the toast that shows this says which adapter refused.
      assert.ok(thrown.message.startsWith("git cannot "), thrown.message)
    }
  })

  test("a pull request ref is refused: git has no pull requests", async () => {
    const { gitAdapter } = await fresh()
    await assert.rejects(
      async () => gitAdapter.headSha({ kind: "pr", number: 1 }),
      (cause: unknown) =>
        cause instanceof GitAdapterError && cause.problem === "unsupported",
    )
  })

  test("a branch row carries its last commit as a title", async () => {
    const { gitAdapter } = await fresh()
    const row = await gitAdapter.target({ kind: "branch", name: "stock-check" })
    assert.strictEqual(row?.title, "feat: refuse an order with no stock")
    assert.strictEqual(row.author, "Nobody")
    assert.strictEqual(row.reason, "added")
    // Nowhere to send a reader: plain git has no web interface.
    assert.strictEqual(row.url, "")
    assert.ok(row.updatedAt !== "")
  })

  test("a branch that does not exist is null, not an exception", async () => {
    const { gitAdapter } = await fresh()
    assert.strictEqual(await gitAdapter.target({ kind: "branch", name: "nope" }), null)
  })

  test("the list is exactly the branches that were added, in order", async () => {
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

  test("nothing added means an empty list rather than every local branch", async () => {
    const { gitAdapter } = await fresh()
    assert.deepStrictEqual(await gitAdapter.listTargets({}), [])
  })

  test("a branch head resolves to a full commit id", async () => {
    const { root, gitAdapter } = await fresh()
    const sha = await gitAdapter.headSha({ kind: "branch", name: "stock-check" })
    const { stdout } = await run("git", ["rev-parse", "stock-check"], { cwd: root })
    assert.strictEqual(sha, stdout.trim())
    assert.strictEqual(sha.length, 40)
  })

  /*
   * Three dots, not two. `main..branch` would answer "what is on the branch and
   * not on main", which is the same thing here but diverges the moment trunk
   * moves — and then the marks in the code panel would show trunk's commits as
   * part of the branch's change.
   */
  test("the diff of a branch is its own work against trunk", async () => {
    const { gitAdapter } = await fresh()
    const diff = await gitAdapter.diff({ kind: "branch", name: "stock-check" })
    assert.ok(diff.includes("hasStock.ts"))
    assert.ok(diff.includes("+  return hasStock()"))
    // Trunk's own file is unchanged by the branch, so it contributes nothing.
    assert.ok(!diff.includes("new file mode 100644\nindex 0000000..0000000"))
  })

  test("a comparison reports files and how many commits apart they are", async () => {
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

  test("a file is read at the commit asked for, not from the working tree", async () => {
    const { root, gitAdapter } = await fresh()
    const onBranch = await gitAdapter.blob("placeOrder.ts", "stock-check")
    assert.ok(onBranch.includes("return hasStock()"))

    const onTrunk = await gitAdapter.blob("placeOrder.ts", "main")
    assert.ok(!onTrunk.includes("return hasStock()"))

    // The working tree is on main, which is what makes the first read a real
    // answer rather than a coincidence.
    const { stdout } = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: root,
    })
    assert.strictEqual(stdout.trim(), "main")
  })

  test("a file that is not in that commit fails as no-repo, not as raw stderr", async () => {
    const { gitAdapter } = await fresh()
    await assert.rejects(
      async () => gitAdapter.blob("hasStock.ts", "main"),
      (cause: unknown) =>
        cause instanceof GitAdapterError &&
        cause.problem === "no-repo" &&
        cause.message.includes("hasStock.ts"),
    )
  })

  test("comparing against a commit that is not fetched says so", async () => {
    const { gitAdapter } = await fresh()
    await assert.rejects(
      async () => gitAdapter.compare("main", "0000000000000000000000000000000000000000"),
      (cause: unknown) =>
        cause instanceof GitAdapterError && cause.problem === "no-repo",
    )
  })
})
