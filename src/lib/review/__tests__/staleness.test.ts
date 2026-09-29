import * as assert from "assert"
import { changedOldLines, citationsOf, classify } from "../staleness"
import { storedDocument } from "../../schemas/document/stored"

suite("pr/staleness", () => {
  const head = "9b8ab31000000000000000000000000000000000"
  const ref = (path: string, focus: [number, number]) => ({
    kind: "ref",
    lang: "ts",
    path,
    target: { focus },
    focus,
  })
  const walkthrough = storedDocument.parse({
    schema: 1,
    meta: { kind: "walkthrough", repo: "owner/repo", at: { pr: 412 }, head },
    title: "t",
    contextBody: { context: "x" },
    diagram: { absent: "none" },
    codeWalkthrough: {
      files: [
        {
          path: "src/a.ts",
          summary: [],
          waypoints: [
            {
              id: "one",
              title: "One",
              // Prose that mentions a reference is not one.
              reading: "Write `code:src/c.ts#L1-2` in a sentence.",
              code: { ...ref("src/a.ts", [10, 20]), marks: [[12, 12]] },
              children: [
                { id: "one-a", title: "A", reading: "a", code: ref("src/a.ts", [80, 90]) },
                { id: "one-b", title: "B", reading: "b", code: null },
              ],
            },
          ],
        },
      ],
    },
    findings: [
      { id: "f", kind: "bug", title: "Bug", reading: "r", code: ref("src/b.ts", [1, 30]) },
    ],
    sources: {
      "src/a.ts": { at: head },
      "src/b.ts": { at: head },
    },
  })

  const cites = citationsOf(walkthrough)
  const tier = (files: Parameters<typeof classify>[1]) =>
    classify(cites, files, "aaa", "bbb", 3).tier

  suite("citationsOf", () => {
    test("groups ranges by file, children and findings included", () => {
      assert.deepStrictEqual(cites, [
        { path: "src/a.ts", ranges: [{ from: 10, to: 20 }, { from: 80, to: 90 }] },
        { path: "src/b.ts", ranges: [{ from: 1, to: 30 }] },
      ])
    })
  })

  suite("changedOldLines", () => {
    test("reads the old side of a hunk header", () => {
      assert.deepStrictEqual(changedOldLines("@@ -12,7 +12,9 @@ ctx"), [
        { from: 12, to: 18 },
      ])
    })

    test("treats a single-line hunk as one line", () => {
      assert.deepStrictEqual(changedOldLines("@@ -200 +210,3 @@"), [
        { from: 200, to: 200 },
      ])
    })

    test("covers the seam for a pure insertion", () => {
      // `-40,0` is an insertion with no old lines. It still sits at line 40, and
      // a citation covering line 40 has had something appear inside it.
      assert.deepStrictEqual(changedOldLines("@@ -40,0 +41,5 @@"), [
        { from: 40, to: 40 },
      ])
    })
  })

  suite("classify", () => {
    test("says nothing when no cited file changed", () => {
      assert.strictEqual(
        tier([{ path: "src/z.ts", status: "modified", patch: "@@ -1,2 +1,3 @@" }]),
        "elsewhere",
      )
    })

    test("is quiet when a cited file changed away from the cited lines", () => {
      assert.strictEqual(
        tier([{ path: "src/a.ts", status: "modified", patch: "@@ -300,4 +300,5 @@" }]),
        "nearby",
      )
    })

    test("warns when the cited lines themselves changed", () => {
      assert.strictEqual(
        tier([{ path: "src/a.ts", status: "modified", patch: "@@ -15,2 +15,4 @@" }]),
        "stale",
      )
    })

    test("warns when a cited file was deleted", () => {
      assert.strictEqual(tier([{ path: "src/b.ts", status: "removed" }]), "stale")
    })

    test("warns when a cited file was renamed out from under it", () => {
      assert.strictEqual(
        tier([{ path: "src/c.ts", status: "renamed", previousPath: "src/b.ts" }]),
        "stale",
      )
    })

    test("warns when it cannot prove the cited lines are untouched", () => {
      // No patch: binary, or too large for the API to include. Silence would be
      // a claim the check cannot support.
      assert.strictEqual(tier([{ path: "src/a.ts", status: "modified" }]), "stale")
    })

    test("says nothing at all when the commits match", () => {
      assert.strictEqual(classify(cites, [], "aaa", "aaa", 0).tier, "current")
    })
  })
})
