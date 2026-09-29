import { describe, expect, it } from "vitest"
import { hunksByPath } from "../hunks"

// The head side starts at 146, so the two context lines are 146 and 147 and
// the additions land on 148-150. The text after `@@` is the enclosing
// function, not a line number.
const diff = `diff --git a/src/checkout/hasStock.ts b/src/checkout/hasStock.ts
--- a/src/checkout/hasStock.ts
+++ b/src/checkout/hasStock.ts
@@ -145,8 +146,9 @@ export async function hasStock(
   basket: BasketLine[],
 ): Promise<StockResult> {
-  for (const line of basket) {
-    const level = await levelFor(line.productId)
-  }
+  const ids = basket.map((line) => line.productId)
+  const levels = await levelsFor(ids)
+  const held = await heldFor(ids)
 
   const short = basket.filter((line) => {
`

describe("hunksByPath", () => {
  it("should report added lines in head-side numbering", () => {
    // Head-side, because the panel renders the file at head.
    expect(hunksByPath(diff)["src/checkout/hasStock.ts"]?.added).toEqual([
      { from: 148, to: 150 },
    ])
  })

  it("should keep removed lines with their text", () => {
    // The capability the old parser did not have. It discarded `-` lines
    // because there is no head-side line to mark; the text is still the
    // comparison a reviewer wants.
    expect(hunksByPath(diff)["src/checkout/hasStock.ts"]?.removed).toEqual([
      {
        after: 147,
        lines: [
          "  for (const line of basket) {",
          "    const level = await levelFor(line.productId)",
          "  }",
        ],
      },
    ])
  })

  it("should merge a run of added lines into one range", () => {
    // Twenty added lines are one annotation, not twenty.
    const run = `--- a/a.ts
+++ b/a.ts
@@ -1,0 +1,3 @@
+one
+two
+three
`
    expect(hunksByPath(run)["a.ts"]?.added).toEqual([{ from: 1, to: 3 }])
  })

  it("should split runs separated by context", () => {
    const split = `--- a/a.ts
+++ b/a.ts
@@ -1,4 +1,4 @@
+one
 context
+three
`
    expect(hunksByPath(split)["a.ts"]?.added).toEqual([
      { from: 1, to: 1 },
      { from: 3, to: 3 },
    ])
  })

  it("should record a removal at the top of a file as after zero", () => {
    const top = `--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,1 @@
-gone
 kept
`
    expect(hunksByPath(top)["a.ts"]?.removed).toEqual([{ after: 0, lines: ["gone"] }])
  })

  it("should ignore a deleted file", () => {
    // `+++ /dev/null` has no head-side file to describe.
    const deleted = `--- a/a.ts
+++ /dev/null
@@ -1,1 +0,0 @@
-gone
`
    expect(hunksByPath(deleted)).toEqual({})
  })

  it("should report a file whose change is only deletions", () => {
    // The one place this disagrees with the parser it replaces. `addedLines`
    // pushed an entry only on a `+`, so a file that lost code and gained none
    // was absent from its result entirely. On every other path the two agree
    // on every added range.
    const cut = `--- a/a.ts
+++ b/a.ts
@@ -10,4 +10,1 @@
 kept
-gone one
-gone two
`
    expect(hunksByPath(cut)["a.ts"]).toEqual({
      added: [],
      removed: [{ after: 10, lines: ["gone one", "gone two"] }],
    })
  })

  it("should place a deletion-only hunk after the line git names", () => {
    // Git writes a pure deletion as `+N,0`, where N is the line the deleted
    // block sat *after* -- not the line it sat before, which is what every
    // other hunk header names. Reading the two alike puts the removal one line
    // too high. Invisible at three lines of context, constant at zero, and
    // zero is what the server asks git for.
    const only = `--- a/a.ts
+++ b/a.ts
@@ -48 +47,0 @@
-gone
`
    expect(hunksByPath(only)["a.ts"]?.removed).toEqual([
      { after: 47, lines: ["gone"] },
    ])
  })

  it("should not read a file header as deleted content", () => {
    // A header is the `--- old` / `+++ new` pair. Matching the prefix alone
    // attributed every header to the previous file as a deletion, which showed
    // up only on a diff where more than one file lost lines.
    const two = `--- a/a.ts
+++ b/a.ts
@@ -1 +1,0 @@
-gone from a
--- a/b.ts
+++ b/b.ts
@@ -1 +1,0 @@
-gone from b
`
    const out = hunksByPath(two)
    expect(out["a.ts"]?.removed).toEqual([{ after: 1, lines: ["gone from a"] }])
    expect(out["b.ts"]?.removed).toEqual([{ after: 1, lines: ["gone from b"] }])
  })

  it("should read several files from one diff", () => {
    const two = `--- a/a.ts
+++ b/a.ts
@@ -1,0 +1,1 @@
+a
--- a/b.ts
+++ b/b.ts
@@ -1,0 +1,1 @@
+b
`
    expect(Object.keys(hunksByPath(two))).toEqual(["a.ts", "b.ts"])
  })
})
