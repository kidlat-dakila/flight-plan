import { isLineInRange, lineLabelsIn, rangeLabelOf, rangeOfSelection, selectLine } from "@/lib/line-selection"

describe("line selection", () => {
  it("starts at the line that is picked, and starts again at the next one", () => {
    expect(selectLine(null, 4, false)).toStrictEqual({ anchorLine: 4, headLine: 4 })
    expect(selectLine({ anchorLine: 4, headLine: 6 }, 9, false)).toStrictEqual({ anchorLine: 9, headLine: 9 })
    expect(selectLine(null, 4, true)).toStrictEqual({ anchorLine: 4, headLine: 4 })
  })

  it("reaches from where it started to the line it is extended to, in either direction", () => {
    expect(rangeOfSelection(selectLine({ anchorLine: 4, headLine: 4 }, 7, true))).toStrictEqual({ lineStart: 4, lineEnd: 7 })
    expect(rangeOfSelection(selectLine({ anchorLine: 4, headLine: 7 }, 2, true))).toStrictEqual({ lineStart: 2, lineEnd: 4 })
  })

  it("knows the lines of a range, and that no range holds no line", () => {
    expect(isLineInRange({ lineStart: 2, lineEnd: 4 }, 4)).toBe(true)
    expect(isLineInRange({ lineStart: 2, lineEnd: 4 }, 5)).toBe(false)
    expect(isLineInRange(null, 2)).toBe(false)
    expect([...lineLabelsIn({ lineStart: 2, lineEnd: 4 })]).toStrictEqual(["2", "3", "4"])
    expect(lineLabelsIn(null).size).toBe(0)
  })

  it("labels a range by its lines", () => {
    expect(rangeLabelOf({ lineStart: 3, lineEnd: 3 })).toBe("Line 3")
    expect(rangeLabelOf({ lineStart: 3, lineEnd: 8 })).toBe("Lines 3 to 8")
  })
})
