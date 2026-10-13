import { describe, expect, it } from "vitest"
import { diffLinesByPath, diffLinesOf, findDiffLine, findPositionEnds, isInDiff } from "@/git-adapter/helpers/diff-lines"

const PATCH = [
  "@@ -3,5 +3,6 @@ export const first = 1",
  " three",
  "-four",
  "-five",
  "+four again",
  "+five again",
  "+five and a half",
  " six",
  "\\ No newline at end of file",
].join("\n")

const DIFF = [
  "diff --git a/src/price.ts b/src/price.ts",
  "index 1111111..2222222 100644",
  "--- a/src/price.ts",
  "+++ b/src/price.ts",
  PATCH,
  "diff --git a/src/gone.ts b/src/gone.ts",
  "deleted file mode 100644",
  "--- a/src/gone.ts",
  "+++ /dev/null",
  "@@ -1,2 +0,0 @@",
  "-one",
  "-two",
].join("\n")

describe("diffLinesOf", () => {
  it("numbers each line of a patch on the side it is on, with where the other side stands", () => {
    expect(diffLinesOf(PATCH)).toStrictEqual([
      { oldLine: 3, newLine: 3, oldCursor: 3, newCursor: 3 },
      { oldLine: 4, newLine: null, oldCursor: 4, newCursor: 4 },
      { oldLine: 5, newLine: null, oldCursor: 5, newCursor: 4 },
      { oldLine: null, newLine: 4, oldCursor: 6, newCursor: 4 },
      { oldLine: null, newLine: 5, oldCursor: 6, newCursor: 5 },
      { oldLine: null, newLine: 6, oldCursor: 6, newCursor: 6 },
      { oldLine: 6, newLine: 7, oldCursor: 6, newCursor: 7 },
    ])
  })

  it("reads nothing before the first hunk", () => {
    expect(diffLinesOf("+not in a hunk\n-nor this")).toStrictEqual([])
  })
})

describe("findDiffLine", () => {
  it("finds a line by the number it has on one side", () => {
    const lines = diffLinesOf(PATCH)

    expect(findDiffLine(lines, "old", 5)).toMatchObject({ oldLine: 5, newLine: null })
    expect(findDiffLine(lines, "new", 5)).toMatchObject({ oldLine: null, newLine: 5 })
    expect(findDiffLine(lines, "new", 7)).toMatchObject({ oldLine: 6, newLine: 7 })
    expect(findDiffLine(lines, "new", 40)).toBeNull()
  })
})

describe("findPositionEnds and isInDiff", () => {
  it("finds both ends of a range in the file's part of a diff", () => {
    const ends = findPositionEnds(diffLinesByPath(DIFF), { path: "src/price.ts", side: "new", startLine: 4, endLine: 6 })

    expect(ends).toMatchObject({ start: { newLine: 4 }, end: { newLine: 6 } })
  })

  it("holds a removed line of a deleted file, and no line outside a hunk or in another file", () => {
    expect(isInDiff(DIFF, { path: "src/gone.ts", side: "old", startLine: 1, endLine: 2 })).toBe(true)
    expect(isInDiff(DIFF, { path: "src/price.ts", side: "new", startLine: 1, endLine: 4 })).toBe(false)
    expect(isInDiff(DIFF, { path: "src/other.ts", side: "new", startLine: 4, endLine: 4 })).toBe(false)
  })
})
