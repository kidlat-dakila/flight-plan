import * as assert from "assert"
import * as os from "node:os"
import * as path from "node:path"
import * as fs from "node:fs/promises"
import { MAX_FILE_BYTES, readRepoFile, resolveInRoot } from "../repo"

suite("repo", () => {
  const root = path.join(os.tmpdir(), "flight-plan-repo-test")

  beforeAll(async () => {
    await fs.mkdir(path.join(root, "src"), { recursive: true })
    await fs.writeFile(path.join(root, "src", "panel.ts"), "one\ntwo\n", "utf8")
    // A sibling whose name starts with the root's, which is what a naive
    // prefix check would wrongly accept.
    await fs.mkdir(`${root}-secrets`, { recursive: true })
    await fs.writeFile(path.join(`${root}-secrets`, "key"), "hunter2", "utf8")
  })

  suite("resolveInRoot", () => {
    test("resolves a path inside the root", () => {
      assert.strictEqual(
        resolveInRoot(root, "src/panel.ts"),
        path.join(root, "src", "panel.ts"),
      )
    })

    test("rejects a path that climbs out of the root", () => {
      assert.strictEqual(resolveInRoot(root, "../elsewhere/file.ts"), null)
    })

    test("rejects a path that climbs out and back to a similar name", () => {
      const escape = `../${path.basename(root)}-secrets/key`
      assert.strictEqual(resolveInRoot(root, escape), null)
    })

    test("rejects an absolute path", () => {
      assert.strictEqual(resolveInRoot(root, "/etc/passwd"), null)
    })

    test("rejects the root itself", () => {
      assert.strictEqual(resolveInRoot(root, "."), null)
    })

    test("rejects an empty path", () => {
      assert.strictEqual(resolveInRoot(root, "   "), null)
    })

    test("collapses a traversal that ends back inside the root", () => {
      assert.strictEqual(
        resolveInRoot(root, "src/../src/panel.ts"),
        path.join(root, "src", "panel.ts"),
      )
    })
  })

  suite("readRepoFile", () => {
    test("reads a file inside the root", async () => {
      assert.strictEqual(await readRepoFile(root, "src/panel.ts"), "one\ntwo\n")
    })

    test("names the path when the file is missing", async () => {
      await assert.rejects(
        readRepoFile(root, "src/gone.ts"),
        /src\/gone\.ts does not exist/,
      )
    })

    test("refuses a path outside the root", async () => {
      await assert.rejects(
        readRepoFile(root, "../anything.ts"),
        /outside the repository/,
      )
    })

    test("refuses a directory", async () => {
      await assert.rejects(readRepoFile(root, "src"), /is not a file/)
    })

    test("refuses a file over the size cap", async () => {
      const big = path.join(root, "big.txt")
      await fs.writeFile(big, "x".repeat(MAX_FILE_BYTES + 1), "utf8")
      await assert.rejects(readRepoFile(root, "big.txt"), /too large to show/)
      await fs.rm(big)
    })
  })
})
