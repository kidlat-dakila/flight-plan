import { describe, expect, test } from "vitest"
import { windowLines } from "../../highlight"

/**
 * The window a code block is drawn from, with removals spliced back in.
 *
 * Lifted out of `highlightReference` so the hover popup could show a diff
 * without a second copy of this arithmetic. A removed line is rendered and has
 * no file line, so every range after it sits further down the block than its
 * numbers suggest — which is exactly the kind of off-by-a-few that a second
 * implementation gets subtly wrong and nobody notices until a band is drawn on
 * the wrong code.
 */
const file = ["a", "b", "c", "d", "e", "f"]

describe("windowLines", () => {
  test("with no removals, renders the window and maps each line to its own", () => {
    const out = windowLines(file, { from: 2, to: 4 })
    expect(out.value).toBe("b\nc\nd")
    expect(out.numbers).toEqual([2, 3, 4])
    expect(out.removedBands).toEqual([])
  })

  test("maps a file range to the lines it occupies in the block", () => {
    const out = windowLines(file, { from: 2, to: 4 })
    expect(out.panelRange({ from: 3, to: 4 })).toEqual({
      fromLineNumber: 2,
      toLineNumber: 3,
    })
  })

  test("clips a range that only partly overlaps the window", () => {
    const out = windowLines(file, { from: 2, to: 4 })
    expect(out.panelRange({ from: 1, to: 3 })).toEqual({
      fromLineNumber: 1,
      toLineNumber: 2,
    })
  })

  test("answers null for a range wholly outside the window", () => {
    const out = windowLines(file, { from: 2, to: 4 })
    expect(out.panelRange({ from: 5, to: 6 })).toBeNull()
  })

  test("splices a removal in after the line it followed, with no file number", () => {
    const out = windowLines(file, { from: 2, to: 4 }, [{ after: 3, lines: ["gone"] }])
    expect(out.value).toBe("b\nc\ngone\nd")
    expect(out.numbers).toEqual([2, 3, null, 4])
    expect(out.removedBands).toEqual([{ from: 3, to: 3 }])
  })

  test("shifts every later range down by what was spliced in above it", () => {
    const out = windowLines(file, { from: 2, to: 4 }, [{ after: 3, lines: ["gone"] }])
    // File line 4 is the fourth rendered line, not the third.
    expect(out.panelRange({ from: 4, to: 4 })).toEqual({
      fromLineNumber: 4,
      toLineNumber: 4,
    })
  })

  test("splices a removal from the very top, but only when the top is on screen", () => {
    const removal = [{ after: 0, lines: ["gone"] }]
    expect(windowLines(file, { from: 1, to: 2 }, removal).numbers).toEqual([null, 1, 2])
    expect(windowLines(file, { from: 2, to: 3 }, removal).numbers).toEqual([2, 3])
  })
})
