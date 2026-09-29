import * as assert from "assert"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { afterAll, beforeAll } from "vitest"
import { hasCommit, readBlob } from "../blob"
import { walkthroughRepository } from "../head"

const run = promisify(execFile)

/**
 * Reading a branch you are not sitting on.
 *
 * The ordinary case, and very nearly the whole point of the tool: a reviewer
 * reads somebody else's pull request from wherever they happen to be. This runs
 * against a real repository rather than a fixture, because the thing under test
 * is what git does with a revision, and a fake `.git` directory cannot answer.
 */
suite("a file at a commit the checkout is not on", () => {
  let root = ""
  let onBranch = ""

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "fp-blob-"))
    const git = (...args: string[]) => run("git", args, { cwd: root })

    await git("init", "--quiet", "--initial-branch", "main")
    await git("config", "user.email", "test@example.com")
    await git("config", "user.name", "Test")

    await fs.writeFile(path.join(root, "a.ts"), "export const one = 1\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "first")

    await git("checkout", "--quiet", "-b", "feature")
    await fs.writeFile(
      path.join(root, "a.ts"),
      "export const one = 1\nexport const two = 2\n",
      "utf8",
    )
    await fs.writeFile(path.join(root, "b.ts"), "export const three = 3\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "second")
    onBranch = (await git("rev-parse", "HEAD")).stdout.trim()

    // Back to main: the feature commit exists, and the working tree is not it.
    await git("checkout", "--quiet", "main")
  })

  afterAll(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  test("reads the file as that commit has it, not as the tree has it", async () => {
    const atCommit = await readBlob(root, onBranch, "a.ts")
    assert.strictEqual(atCommit, "export const one = 1\nexport const two = 2\n")

    const onDisk = await fs.readFile(path.join(root, "a.ts"), "utf8")
    assert.strictEqual(onDisk, "export const one = 1\n")
  })

  test("reads a file the working tree does not have at all", async () => {
    // `b.ts` exists only on the branch. Reading the tree would report it
    // missing and refuse the write for a document that was correct.
    assert.strictEqual(await readBlob(root, onBranch, "b.ts"), "export const three = 3\n")
    assert.strictEqual(
      await fs.access(path.join(root, "b.ts")).then(
        () => true,
        () => false,
      ),
      false,
    )
  })

  test("answers null for a path the commit does not have", async () => {
    assert.strictEqual(await readBlob(root, onBranch, "gone.ts"), null)
  })

  test("answers null for a commit that is not here", async () => {
    const absent = "0".repeat(40)
    assert.strictEqual(await readBlob(root, absent, "a.ts"), null)
    assert.strictEqual(await hasCommit(root, absent), false)
  })

  test("refuses a path that climbs out of the repository", async () => {
    assert.strictEqual(await readBlob(root, onBranch, "../outside.ts"), null)
    assert.strictEqual(await readBlob(root, onBranch, "/etc/passwd"), null)
    assert.strictEqual(await readBlob(root, onBranch, "-flag"), null)
  })

  test("gives a walkthrough a repository without switching branch", async () => {
    // The whole fix, end to end: the document names the feature commit, the
    // checkout is on main, and the references resolve anyway.
    const outcome = await walkthroughRepository(root, onBranch)
    assert.ok(outcome.ok, "expected a repository")
    assert.strictEqual(
      await outcome.repo.readFile("a.ts"),
      "export const one = 1\nexport const two = 2\n",
    )
    // And it says the working tree is not that commit, so symbols are not
    // read from disk.
    assert.strictEqual(outcome.onDisk, false)
  })

  test("says the tree is the commit when it actually is", async () => {
    const main = (await run("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim()
    const outcome = await walkthroughRepository(root, main)
    assert.ok(outcome.ok)
    assert.strictEqual(outcome.onDisk, true)
  })
})
