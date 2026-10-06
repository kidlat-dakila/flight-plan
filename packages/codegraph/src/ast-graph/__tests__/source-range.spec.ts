import { parseWithGrammar } from "@/ast-graph/parser"
import {
  clipLines,
  containsLines,
  containsPosition,
  containsRange,
  isSameRange,
  joinAdjacentLines,
  linesOf,
  overlapsLines,
  rangeOf,
} from "@/ast-graph/source-range"
import type { SourceRange } from "@/ast-graph/types"

const range = (startLine: number, startColumn: number, endLine: number, endColumn: number): SourceRange => ({
  start: { line: startLine, column: startColumn },
  end: { line: endLine, column: endColumn },
})

describe("rangeOf", () => {
  it("gives where a syntax node sits, with lines counted from one", () => {
    const tree = parseWithGrammar("typescript", "const first = 1\nconst second = 2")

    expect(tree.rootNode.namedChildren.map(rangeOf)).toStrictEqual([range(1, 0, 1, 15), range(2, 0, 2, 16)])
  })
})

describe("containsPosition", () => {
  const body = range(2, 4, 5, 1)

  it("holds a position between its ends, and each end itself", () => {
    expect(containsPosition(body, { line: 3, column: 0 })).toBe(true)
    expect(containsPosition(body, { line: 2, column: 4 })).toBe(true)
    expect(containsPosition(body, { line: 5, column: 1 })).toBe(true)
  })

  it("does not hold a position before its start or after its end", () => {
    expect(containsPosition(body, { line: 2, column: 3 })).toBe(false)
    expect(containsPosition(body, { line: 5, column: 2 })).toBe(false)
    expect(containsPosition(body, { line: 1, column: 9 })).toBe(false)
  })
})

describe("containsRange", () => {
  it("holds a range that lies inside it, and itself", () => {
    expect(containsRange(range(1, 0, 9, 1), range(2, 2, 4, 3))).toBe(true)
    expect(containsRange(range(1, 0, 9, 1), range(1, 0, 9, 1))).toBe(true)
  })

  it("does not hold a range that crosses one of its ends", () => {
    expect(containsRange(range(2, 0, 9, 1), range(1, 0, 4, 3))).toBe(false)
    expect(containsRange(range(1, 0, 4, 1), range(2, 0, 5, 0))).toBe(false)
  })
})

describe("containsLines", () => {
  it("holds lines from its first line to its last", () => {
    expect(containsLines(range(2, 4, 5, 1), [2, 5])).toBe(true)
    expect(containsLines(range(2, 4, 5, 1), [3, 3])).toBe(true)
  })

  it("does not hold lines that reach past it", () => {
    expect(containsLines(range(2, 4, 5, 1), [1, 3])).toBe(false)
    expect(containsLines(range(2, 4, 5, 1), [4, 6])).toBe(false)
  })
})

describe("clipLines", () => {
  it("keeps the lines that lie inside the range", () => {
    expect(clipLines(range(2, 4, 5, 1), [3, 4])).toStrictEqual([3, 4])
    expect(clipLines(range(2, 4, 5, 1), [2, 5])).toStrictEqual([2, 5])
  })

  it("cuts lines that reach past the range down to the lines of the range", () => {
    expect(clipLines(range(2, 4, 5, 1), [1, 3])).toStrictEqual([2, 3])
    expect(clipLines(range(2, 4, 5, 1), [4, 9])).toStrictEqual([4, 5])
    expect(clipLines(range(2, 4, 5, 1), [1, 9])).toStrictEqual([2, 5])
  })

  it("gives nothing for lines that lie outside the range", () => {
    expect(clipLines(range(2, 4, 5, 1), [6, 8])).toBeNull()
    expect(clipLines(range(2, 4, 5, 1), [1, 1])).toBeNull()
  })
})

describe("overlapsLines", () => {
  it("tells lines that share a line with the range from lines that lie outside it", () => {
    expect(overlapsLines(range(2, 4, 5, 1), [1, 2])).toBe(true)
    expect(overlapsLines(range(2, 4, 5, 1), [5, 9])).toBe(true)
    expect(overlapsLines(range(2, 4, 5, 1), [3, 3])).toBe(true)
    expect(overlapsLines(range(2, 4, 5, 1), [1, 1])).toBe(false)
    expect(overlapsLines(range(2, 4, 5, 1), [6, 6])).toBe(false)
  })
})

describe("linesOf", () => {
  it("gives the first and the last line of a range", () => {
    expect(linesOf(range(2, 4, 5, 1))).toStrictEqual([2, 5])
  })
})

describe("joinAdjacentLines", () => {
  it("joins ranges that overlap or follow each other, in line order", () => {
    expect(joinAdjacentLines([[7, 8], [1, 2], [3, 3], [8, 12]])).toStrictEqual([[1, 3], [7, 12]])
  })

  it("keeps ranges with a line between them apart, and a range inside another once", () => {
    expect(joinAdjacentLines([[1, 2], [4, 9], [5, 6]])).toStrictEqual([[1, 2], [4, 9]])
    expect(joinAdjacentLines([])).toStrictEqual([])
  })
})

describe("isSameRange", () => {
  it("tells two ranges with the same ends from two that differ", () => {
    expect(isSameRange(range(1, 0, 2, 3), range(1, 0, 2, 3))).toBe(true)
    expect(isSameRange(range(1, 0, 2, 3), range(1, 0, 2, 4))).toBe(false)
  })
})
