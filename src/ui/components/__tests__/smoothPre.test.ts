import { describe, expect, test } from "vitest"
import { MAX_ANIMATED_TOKENS, worthAnimating } from "../SmoothPre"

/*
 * When a token animation is worth its cost.
 *
 * The animation is a nicety; a scroll that responds is not. Code Hike measures
 * every token twice per change — a rect and a computed style each, interleaved,
 * which forces layout per element — then diffs the list and creates one Web
 * Animation per moved token. That is fine for an excerpt and ruinous for a
 * whole file, and a walkthrough whose waypoints all reference one file of six
 * hundred lines or fewer renders the whole file every time.
 */
describe("worthAnimating", () => {
  test("animates an ordinary waypoint excerpt", () => {
    // A sixty-line window measures about two hundred and eighty elements.
    expect(worthAnimating(276)).toBe(true)
  })

  test("refuses a whole-file panel", () => {
    // A whole file of several hundred lines measures in the thousands.
    expect(worthAnimating(2530)).toBe(false)
  })

  test("draws the line somewhere between the two", () => {
    expect(MAX_ANIMATED_TOKENS).toBeGreaterThan(276)
    expect(MAX_ANIMATED_TOKENS).toBeLessThan(2530)
  })

  test("animates exactly at the cap, and not past it", () => {
    expect(worthAnimating(MAX_ANIMATED_TOKENS)).toBe(true)
    expect(worthAnimating(MAX_ANIMATED_TOKENS + 1)).toBe(false)
  })

  test("animates an empty panel rather than treating it as huge", () => {
    expect(worthAnimating(0)).toBe(true)
  })
})
