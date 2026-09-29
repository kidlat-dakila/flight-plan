import { describe, expect, test } from "vitest"
import { ownedEnd } from "../collapsible"

/*
 * What a fold reaches, over the levels alone.
 *
 * The DOM half of folding is a walk; this is the rule it walks by, and it is
 * the half that was wrong. A `## file.ts` heading folded its own overview list
 * and left every waypoint under it on screen, because ownership was read from
 * DOM siblings and the first heading in a document is lifted into a band of its
 * own, away from the waypoints it introduces.
 *
 * Levels are given in document order, as the document view emits them: 2 for a
 * file's block, 3 for a waypoint, 4 and 5 for the blocks
 * inside it, 0 for a block that opens with no heading at all.
 */
describe("ownedEnd", () => {
  /** A file heading, one waypoint with a child, then the next file heading. */
  const document = [2, 3, 4, 2, 3]

  test("a file heading owns every waypoint under it", () => {
    expect(ownedEnd(document, 0, 2)).toBe(3)
  })

  test("a waypoint owns its own children and stops at its sibling", () => {
    expect(ownedEnd([3, 4, 4, 3], 0, 3)).toBe(3)
  })

  test("a waypoint owns children of every depth below it", () => {
    // The three-level case: a body, a nested function inside it, and the
    // execution steps inside that.
    expect(ownedEnd([3, 4, 5, 5, 4, 3], 0, 3)).toBe(5)
  })

  test("a child block owns the deeper blocks under it", () => {
    expect(ownedEnd([3, 4, 5, 5, 4], 1, 4)).toBe(4)
  })

  test("a block with nothing under it owns nothing", () => {
    expect(ownedEnd(document, 2, 4)).toBe(3)
    expect(ownedEnd(document, 4, 3)).toBe(5)
  })

  test("a block with no heading ends the section, like a shallower one", () => {
    // Level 0 is prose that opens with plain content. It is not inside the
    // section above it, so folding that section must leave it alone.
    expect(ownedEnd([2, 3, 0, 3], 0, 2)).toBe(2)
  })
})
