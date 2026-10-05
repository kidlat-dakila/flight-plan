import * as assert from "node:assert"
import { splitDiff } from "@/utils/git-adapter/helpers/diff"
import { sameCommit } from "@/utils/git-adapter/types"

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

  it("every file in the diff is found exactly once", () => {
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

  it("a modified file keeps its hunks", () => {
    const file = files[0]
    assert.strictEqual(file.status, "modified")
    assert.ok(file.patch !== undefined)
    assert.strictEqual(file.patch.includes("@@ -10,6 +10,7 @@"), true)
    assert.strictEqual(file.patch.includes("+  if (!hasStock(cart)) return refuse()"), true)
  })

  it("a rename reports both paths", () => {
    const file = files.find((candidate) => candidate.path === "src/checkout/newName.ts")
    assert.strictEqual(file?.status, "renamed")
    assert.strictEqual(file.previousPath, "src/checkout/oldName.ts")
  })

  it("a deletion is a deletion and not a file called /dev/null", () => {
    const file = files.find((candidate) => candidate.path === "src/checkout/gone.ts")
    assert.strictEqual(file?.status, "removed")
  })

  it("an addition is recognised from its header, not from having no old side", () => {
    const file = files.find((candidate) => candidate.path === "src/checkout/added.ts")
    assert.strictEqual(file?.status, "added")
    assert.strictEqual(file.patch?.includes("+export function added() {}"), true)
  })

  it("a binary file is listed with no patch at all", () => {
    const file = files.find((candidate) => candidate.path === "resources/logo.png")
    assert.notStrictEqual(file, undefined)
    assert.strictEqual(file?.patch, undefined)
  })

  it("an empty diff is no files rather than one empty one", () => {
    assert.deepStrictEqual(splitDiff(""), [])
    assert.deepStrictEqual(splitDiff("\n"), [])
  })
})

suite("comparing commit identifiers of different lengths", () => {
  const full = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678"

  it("a full hash equals itself", () => {
    assert.ok(sameCommit(full, full))
  })

  it("an abbreviation matches the full hash it abbreviates", () => {
    assert.ok(sameCommit(full.slice(0, 12), full))
    assert.ok(sameCommit(full, full.slice(0, 12)))
    assert.ok(sameCommit(full.slice(0, 7), full))
  })

  it("case does not matter", () => {
    assert.ok(sameCommit(full.toUpperCase(), full))
  })

  it("something too short to be an abbreviation does not match", () => {
    assert.ok(!sameCommit(full.slice(0, 6), full))
  })

  it("two identical short identifiers are the same commit", () => {
    assert.ok(sameCommit("aaa", "aaa"))
    assert.ok(sameCommit("HEAD", "HEAD"))
    assert.ok(!sameCommit("aaa", "aab"))
  })

  it("a different commit does not match", () => {
    assert.ok(!sameCommit("b1b2c3d4e5f6", full))
    assert.ok(!sameCommit("", full))
    assert.ok(!sameCommit(full, ""))
  })
})
