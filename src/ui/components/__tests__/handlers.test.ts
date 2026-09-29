import { describe, expect, test } from "vitest"
import { buildHandlers, diff, mark } from "../handlers"

/*
 * These assert the shape of the handler list rather than its rendering, which
 * is where the two bugs they guard actually lived: not in what a handler drew,
 * but in two handlers quietly claiming the same thing.
 */
describe("annotation handlers", () => {
  test("the diff does not turn itself into a mark", () => {
    /*
     * It used to, and the two then shared one channel: a line both added by the
     * pull request and marked by the author carried two `mark` annotations, one
     * of them reached the row, and it was always the diff's. Marks over changed
     * code — most marks, in a walkthrough — became invisible. The diff now
     * carries its own attribute and the stylesheet decides which wins.
     */
    expect(diff.transform).toBeUndefined()
  })

  test("only one handler renders the line row", () => {
    // Two of them did, so every line had two nested rows: two left borders and
    // a second flex context, and no single answer to "which element is a line".
    const rendered = buildHandlers({ lineNumbers: true, wordWrap: false })
      .map((handler) => handler.Line?.toString() ?? "")
      .filter((body) => body.includes("fp-line-row"))
    expect(rendered).toHaveLength(1)
  })

  test("the mark carries the line rather than boxing it", () => {
    expect(mark.Line?.toString()).toContain("fp-line-mark")
  })
})
