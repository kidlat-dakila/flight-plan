import * as assert from "assert"
import { splitDiff } from "../diff"
import { sameCommit } from "../../../../lib/git-adapter/types"

/**
 * A diff with one of everything.
 *
 * Written out rather than generated, because the shapes that break a splitter
 * are the ones a generator would not think to produce: a rename with no hunks
 * at all, a deletion whose `+++` is `/dev/null`, and a binary file that has a
 * header and no patch.
 */
const DIFF = `diff --git a/src/checkout/placeOrder.ts b/src/checkout/placeOrder.ts
index 1111111..2222222 100644
--- a/src/checkout/placeOrder.ts
+++ b/src/checkout/placeOrder.ts
@@ -10,6 +10,7 @@ export function placeOrder() {
   const cart = readCart()
+  if (!hasStock(cart)) return refuse()
   return submit(cart)
 }
diff --git a/src/checkout/oldName.ts b/src/checkout/newName.ts
similarity index 100%
rename from src/checkout/oldName.ts
rename to src/checkout/newName.ts
diff --git a/src/checkout/gone.ts b/src/checkout/gone.ts
deleted file mode 100644
index 3333333..0000000
--- a/src/checkout/gone.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export function gone() {
-  return null
-}
diff --git a/src/checkout/added.ts b/src/checkout/added.ts
new file mode 100644
index 0000000..4444444
--- /dev/null
+++ b/src/checkout/added.ts
@@ -0,0 +1,2 @@
+export function added() {}
+
diff --git a/resources/logo.png b/resources/logo.png
index 5555555..6666666 100644
Binary files a/resources/logo.png and b/resources/logo.png differ
`

suite("splitting a unified diff into files", () => {
  const files = splitDiff(DIFF)

  test("every file in the diff is found exactly once", () => {
    assert.deepStrictEqual(
      files.map((file) => file.path),
      [
        "src/checkout/placeOrder.ts",
        "src/checkout/newName.ts",
        "src/checkout/gone.ts",
        "src/checkout/added.ts",
        "resources/logo.png",
      ],
    )
  })

  test("a modified file keeps its hunks", () => {
    const file = files[0]
    assert.strictEqual(file?.status, "modified")
    assert.ok(file.patch?.includes("@@ -10,6 +10,7 @@"))
    assert.ok(file.patch?.includes("+  if (!hasStock(cart)) return refuse()"))
  })

  /*
   * The case the staleness check depends on. A rename moves the old path out
   * from under a citation, which for a reader is the same problem as a
   * deletion, so the old path has to survive into the result even though the
   * diff has no hunks to attribute it to.
   */
  test("a rename reports both paths", () => {
    const file = files.find((candidate) => candidate.path === "src/checkout/newName.ts")
    assert.strictEqual(file?.status, "renamed")
    assert.strictEqual(file.previousPath, "src/checkout/oldName.ts")
  })

  test("a deletion is a deletion and not a file called /dev/null", () => {
    const file = files.find((candidate) => candidate.path === "src/checkout/gone.ts")
    assert.strictEqual(file?.status, "removed")
  })

  test("an addition is recognised from its header, not from having no old side", () => {
    const file = files.find((candidate) => candidate.path === "src/checkout/added.ts")
    assert.strictEqual(file?.status, "added")
    assert.ok(file.patch?.includes("+export function added() {}"))
  })

  /*
   * A binary file has a header and no patch, and `classify` in staleness.ts
   * treats a cited file with no patch as affected — it cannot prove the lines
   * are fine. So `patch` must be absent here rather than an empty string, which
   * would read as "a patch that changed nothing".
   */
  test("a binary file is listed with no patch at all", () => {
    const file = files.find((candidate) => candidate.path === "resources/logo.png")
    assert.notStrictEqual(file, undefined)
    assert.strictEqual(file?.patch, undefined)
  })

  test("an empty diff is no files rather than one empty one", () => {
    assert.deepStrictEqual(splitDiff(""), [])
    assert.deepStrictEqual(splitDiff("\n"), [])
  })
})

/**
 * Bitbucket returns abbreviated commit hashes — its own schema allows seven
 * characters and up, and live responses come back at twelve — while a
 * walkthrough's frontmatter records the full SHA it was written against. Exact
 * string equality between those two is false for the same commit, which would
 * report every Bitbucket walkthrough as stale on the commit it was written
 * against.
 */
suite("comparing commit identifiers of different lengths", () => {
  const full = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678"

  test("a full hash equals itself", () => {
    assert.ok(sameCommit(full, full))
  })

  test("an abbreviation matches the full hash it abbreviates", () => {
    assert.ok(sameCommit(full.slice(0, 12), full))
    assert.ok(sameCommit(full, full.slice(0, 12)))
    assert.ok(sameCommit(full.slice(0, 7), full))
  })

  test("case does not matter", () => {
    assert.ok(sameCommit(full.toUpperCase(), full))
  })

  /*
   * Six characters is below git's own minimum and is far too likely to collide
   * to be treated as an abbreviation. Refusing it is safer than a false match,
   * because a false match here reports a stale walkthrough as current.
   */
  test("something too short to be an abbreviation does not match", () => {
    assert.ok(!sameCommit(full.slice(0, 6), full))
  })

  /*
   * Equality is not abbreviation. The seven-character minimum governs how short
   * a prefix may be before it is too likely to collide; two identical strings
   * name the same commit however short they are, and applying the minimum to
   * them made a commit fail to match itself.
   */
  test("two identical short identifiers are the same commit", () => {
    assert.ok(sameCommit("aaa", "aaa"))
    assert.ok(sameCommit("HEAD", "HEAD"))
    assert.ok(!sameCommit("aaa", "aab"))
  })

  test("a different commit does not match", () => {
    assert.ok(!sameCommit("b1b2c3d4e5f6", full))
    assert.ok(!sameCommit("", full))
    assert.ok(!sameCommit(full, ""))
  })
})
