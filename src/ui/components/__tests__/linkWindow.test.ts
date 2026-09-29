import { describe, expect, test } from "vitest"
import { linkWindow } from "../Walkthrough"

/*
 * How much of a file a `code:` link's popup shows.
 *
 * The named lines were once the whole excerpt, and two or three lines lifted
 * out of a file tell a reader what the code says and nothing about what it sits
 * in. Ten either side is the answer, and the clamping is the part worth pinning
 * down: a range within ten lines of either end is where an off-by-one shows up,
 * as a blank leading line or as a window that has slid off the lines it is
 * supposed to be about.
 *
 * The named range itself is not widened — only the slice around it — so every
 * case here also checks that the named lines are still inside what comes back.
 */
describe("linkWindow", () => {
  test("pads ten lines either side of the named range", () => {
    expect(linkWindow({ from: 75, to: 90 }, 400)).toEqual({ from: 65, to: 100 })
  })

  test("pads a single named line the same way", () => {
    // The common case: a trace step names one line, and one line on its own is
    // the least placeable thing the popup can show.
    expect(linkWindow({ from: 42, to: 42 }, 400)).toEqual({ from: 32, to: 52 })
  })

  test("stops at the first line rather than going above it", () => {
    expect(linkWindow({ from: 3, to: 5 }, 400)).toEqual({ from: 1, to: 15 })
  })

  test("stops at the last line rather than going past it", () => {
    expect(linkWindow({ from: 95, to: 98 }, 100)).toEqual({ from: 85, to: 100 })
  })

  test("clamps both ends at once in a file shorter than the context", () => {
    // Six lines, ten of context: the window is the whole file and the slice is
    // still valid, which is what stops a short file rendering blank.
    expect(linkWindow({ from: 2, to: 4 }, 6)).toEqual({ from: 1, to: 6 })
  })

  test("survives an empty file without inverting the range", () => {
    // `to` below `from` would slice nothing at all. A one-line window over a
    // file with no lines yields empty text, which the caller already drops.
    expect(linkWindow({ from: 1, to: 1 }, 0)).toEqual({ from: 1, to: 1 })
  })

  test("keeps the named lines inside the window in every case", () => {
    const cases = [
      { range: { from: 1, to: 1 }, total: 1 },
      { range: { from: 1, to: 400 }, total: 400 },
      { range: { from: 200, to: 260 }, total: 400 },
      { range: { from: 400, to: 400 }, total: 400 },
    ]
    for (const { range, total } of cases) {
      const window = linkWindow(range, total)
      expect(window.from).toBeLessThanOrEqual(range.from)
      expect(window.to).toBeGreaterThanOrEqual(range.to)
    }
  })
})
