import * as assert from "assert"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { afterAll, beforeAll, describe, it } from "vitest"
import { mainlineCommit } from "../blob"
import { blobsFor } from "../covered"
import type { StoredDocument } from "../../../lib/schemas/document/stored"

const run = promisify(execFile)

/**
 * Which version of a file a reference is about.
 *
 * A file the change touches is the branch's; everything else is the mainline's,
 * because that is the copy a reader has. The two only differ once main moves,
 * which is why this runs against a real repository: the thing under test is
 * what git hands back for two revisions of one path.
 */
describe("the substrate a path is read at", () => {
  let root = ""
  let branchSha = ""
  let mainSha = ""

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "fp-substrate-"))
    const git = (...args: string[]) => run("git", args, { cwd: root })

    await git("init", "--quiet", "--initial-branch", "main")
    await git("config", "user.email", "test@example.com")
    await git("config", "user.name", "Test")

    await fs.writeFile(path.join(root, "changed.ts"), "const one = 1\n", "utf8")
    await fs.writeFile(path.join(root, "context.ts"), "const context = 1\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "first")

    // The branch changes one file and leaves the other alone.
    await git("checkout", "--quiet", "-b", "feature")
    await fs.writeFile(path.join(root, "changed.ts"), "const one = 2\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "the change")
    branchSha = (await git("rev-parse", "HEAD")).stdout.trim()

    // Main moves on, in the file the branch never touched.
    await git("checkout", "--quiet", "main")
    await fs.writeFile(path.join(root, "context.ts"), "const context = 99\n", "utf8")
    await git("add", ".")
    await git("commit", "--quiet", "-m", "main moves")
    mainSha = (await git("rev-parse", "HEAD")).stdout.trim()
    await git("update-ref", "refs/remotes/origin/main", mainSha)
    await git("checkout", "--quiet", "feature")
  })

  afterAll(async () => {
    if (root !== "") await fs.rm(root, { recursive: true, force: true })
  })

  it("should find the mainline through origin/main", async () => {
    assert.strictEqual(await mainlineCommit(root), mainSha)
  })

  it("should read each path at the commit the document recorded", async () => {
    const doc = {
      meta: { kind: "walkthrough", head: branchSha },
      sources: {
        "changed.ts": { at: branchSha },
        "context.ts": { at: mainSha },
      },
    } as unknown as StoredDocument

    const blobs = await blobsFor(root, doc)
    // The branch's copy of what it changed...
    assert.strictEqual(await blobs.read("changed.ts"), "const one = 2\n")
    // ...and the mainline's copy of what it did not, which is the version the
    // reader has. The branch still carries `const context = 1`.
    assert.strictEqual(await blobs.read("context.ts"), "const context = 99\n")
  })

  it("should fall back to the document's own head when a path was not recorded", async () => {
    const doc = {
      meta: { kind: "walkthrough", head: branchSha },
      sources: {},
    } as unknown as StoredDocument

    const blobs = await blobsFor(root, doc)
    assert.strictEqual(await blobs.read("context.ts"), "const context = 1\n")
  })
})
