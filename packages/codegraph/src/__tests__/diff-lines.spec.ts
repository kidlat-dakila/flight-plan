import { diffLinesOf } from "@/diff-lines"

const patchOf = (...lines: readonly string[]): string => lines.join("\n")

describe("diffLinesOf", () => {
  it("gives the added lines of a hunk as one range", () => {
    expect(diffLinesOf(patchOf("@@ -1,2 +1,4 @@", " first", "+second", "+third", " fourth"))).toStrictEqual([[2, 3]])
  })

  it("gives every line of a new file", () => {
    expect(diffLinesOf(patchOf("@@ -0,0 +1,3 @@", "+first", "+second", "+third"))).toStrictEqual([[1, 3]])
  })

  it("counts a replaced line once, at the line that replaces it", () => {
    expect(diffLinesOf(patchOf("@@ -1,3 +1,3 @@", " first", "-old", "+new", " third"))).toStrictEqual([[2, 2]])
  })

  it("places lines that were only removed on the line before them", () => {
    expect(diffLinesOf(patchOf("@@ -1,4 +1,2 @@", " first", "-second", "-third", " fourth"))).toStrictEqual([[1, 1]])
    expect(diffLinesOf(patchOf("@@ -3,2 +2,0 @@", "-third", "-fourth"))).toStrictEqual([[2, 2]])
  })

  it("places lines removed from the top of a file on its first line", () => {
    expect(diffLinesOf(patchOf("@@ -1,2 +1,1 @@", "-first", " second"))).toStrictEqual([[1, 1]])
  })

  it("keeps the ranges of separate hunks apart and joins the ones that touch", () => {
    const patch = patchOf("@@ -1,2 +1,3 @@", " first", "+second", " third", "@@ -9,2 +10,4 @@", " tenth", "+eleventh", "+twelfth", " thirteenth")

    expect(diffLinesOf(patch)).toStrictEqual([[2, 2], [11, 12]])
    expect(diffLinesOf(patchOf("@@ -1,1 +1,2 @@", " first", "+second", "@@ -2,1 +3,2 @@", "+third", " fourth"))).toStrictEqual([[2, 3]])
  })

  it("skips the note about a missing final line break and what comes before the first hunk", () => {
    const patch = patchOf("diff --git a/src/a.ts b/src/a.ts", "--- a/src/a.ts", "+++ b/src/a.ts", "@@ -1,1 +1,1 @@", "-old", "+new", "\\ No newline at end of file")

    expect(diffLinesOf(patch)).toStrictEqual([[1, 1]])
  })

  it("gives nothing for a patch without hunks", () => {
    expect(diffLinesOf("")).toStrictEqual([])
  })
})
