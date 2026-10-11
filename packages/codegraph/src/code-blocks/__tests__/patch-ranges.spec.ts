import { diffsOf } from "@/code-blocks/patch-ranges"
import type { SourceRange } from "@/code-blocks/types"
import { rangeAt } from "./group-fixture"

const patchOf = (...lines: readonly string[]): string => lines.join("\n")

const diffRangesOf = (patch: string): SourceRange[] => diffsOf(patch).map((diff) => diff.range)

describe("diffsOf", () => {
  it("says of each change whether its lines were added, deleted or modified", () => {
    const patch = patchOf(
      "@@ -1,7 +1,7 @@",
      "+import { notify } from \"./notify\"",
      " function check() {",
      "-  log()",
      "   run()",
      "-  return save(user, true)",
      "+  return save(user)",
      "-  done()",
      "+  finish()",
      "+  close()",
      " }",
    )

    expect(diffsOf(patch).map((diff) => [diff.type, diff.range.start.line])).toStrictEqual([["added", 1], ["deleted", 3], ["modified", 4], ["modified", 5], ["modified", 6]])
  })

  it("gives the middle of a replaced line, between what the old and the new line share", () => {
    const patch = patchOf("@@ -13,1 +13,1 @@", "-    <button onClick={() => remove(id)} />", "+    <button onClick={() => removeItem(id)} />")

    expect(diffRangesOf(patch)).toStrictEqual([rangeAt(13, 34, 13, 38)])
  })

  it("pairs a run of removed lines with the same number of added lines, in order", () => {
    const patch = patchOf("@@ -1,2 +1,2 @@", "-const a = 1", "-const b = 2", "+const a = 10", "+const c = 2")

    expect(diffRangesOf(patch)).toStrictEqual([rangeAt(1, 12, 1, 13), rangeAt(2, 7, 2, 8)])
  })

  it("gives a position with no width when text was only taken out of a line", () => {
    const patch = patchOf("@@ -4,1 +4,1 @@", "-  return save(user, true)", "+  return save(user)")

    expect(diffRangesOf(patch)).toStrictEqual([rangeAt(4, 19, 4, 19)])
  })

  it("gives the whole of a line that is only added, without the blanks around it", () => {
    const patch = patchOf("@@ -1,2 +1,3 @@", " function check() {", "+  notify()  ", " }")

    expect(diffRangesOf(patch)).toStrictEqual([rangeAt(2, 3, 2, 11)])
  })

  it("gives no range for an added line that is blank", () => {
    expect(diffRangesOf(patchOf("@@ -1,1 +1,3 @@", " first", "+", "+  "))).toStrictEqual([])
  })

  it("gives a position with no width where lines were only removed", () => {
    const patch = patchOf("@@ -1,4 +1,2 @@", " first", "-second", "-third", " fourth")

    expect(diffRangesOf(patch)).toStrictEqual([rangeAt(2, 1, 2, 1)])
  })

  it("gives the whole of each added line when a run removes and adds different numbers of lines", () => {
    const patch = patchOf("@@ -1,2 +1,3 @@", "-old one", "-old two", "+new one", "+  new two", "+new three")

    expect(diffRangesOf(patch)).toStrictEqual([rangeAt(1, 1, 1, 8), rangeAt(2, 3, 2, 10), rangeAt(3, 1, 3, 10)])
  })

  it("reads every hunk of a patch and every line of a new file", () => {
    const patch = patchOf("@@ -0,0 +1,2 @@", "+first", "+second", "@@ -9,2 +11,3 @@", " tenth", "+eleventh", " twelfth")

    expect(diffRangesOf(patch)).toStrictEqual([rangeAt(1, 1, 1, 6), rangeAt(2, 1, 2, 7), rangeAt(12, 1, 12, 9)])
  })

  it("starts a new run when a removed line follows added lines", () => {
    const patch = patchOf("@@ -1,2 +1,2 @@", "-one", "+uno", "-two", "+dos")

    expect(diffRangesOf(patch)).toStrictEqual([rangeAt(1, 1, 1, 4), rangeAt(2, 1, 2, 4)])
  })

  it("skips the marker of a file that does not end in a line break, and reads nothing from an empty patch", () => {
    expect(diffRangesOf(patchOf("@@ -1,1 +1,1 @@", "-old", "\\ No newline at end of file", "+new", "\\ No newline at end of file"))).toStrictEqual([
      rangeAt(1, 1, 1, 4),
    ])
    expect(diffRangesOf("")).toStrictEqual([])
  })
})
