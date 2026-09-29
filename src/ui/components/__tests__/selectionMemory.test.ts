import { describe, expect, test } from "vitest"
import {
  measureBand,
  quantizeBand,
  restorableIndex,
  settleBand,
} from "../Scrollycoding"

/*
 * The band has to be steady, because moving it costs the reader their place.
 *
 * Code Hike's `Scroller` ignores a changed `rootMargin` — its effect lists only
 * the window height — so the only way to apply a new band is to remount the
 * provider, and the provider owns the selected waypoint. Every band change is
 * therefore a jump back to waypoint one, which is why "close enough" has to
 * mean "do not move".
 *
 * Stated in view heights rather than in band internals, because that is the
 * thing that changes: a reader drags a split, or a terminal opens.
 */
describe("the band as the view is resized", () => {
  /** The band a view of this height gets, given the band already in use. */
  const bandFor = (viewHeight: number, held: ReturnType<typeof measureBand> | null) => {
    const raw = settleBand(held, measureBand(0, viewHeight))
    return { raw, band: quantizeBand(raw) }
  }

  test("one pixel does not move it", () => {
    /*
     * The whole bug. 45% of 800 is exactly 7.5 quanta, a rounding tie, so a
     * single pixel used to round the other way and move the band 48px — which
     * remounted the provider and threw the reader back to waypoint one.
     */
    const first = bandFor(800, null)
    expect(bandFor(799, first.raw).band).toEqual(first.band)
    expect(bandFor(801, first.raw).band).toEqual(first.band)
  })

  test("no view height is on a knife edge", () => {
    // The tie at 800 was not special; it is simply where this was noticed.
    for (let height = 300; height <= 1400; height += 1) {
      const held = bandFor(height, null)
      for (const nudge of [-1, 1]) {
        expect(bandFor(height + nudge, held.raw).band, `${height}${nudge > 0 ? "+" : ""}${nudge}`).toEqual(held.band)
      }
    }
  })

  test("a real resize does move it", () => {
    // A terminal opening, or the window resized: the band has to follow, or
    // the trigger line ends up somewhere the reader is not looking.
    const first = bandFor(800, null)
    expect(bandFor(1100, first.raw).band).not.toEqual(first.band)
  })

  test("small drifts in one direction add up to a move", () => {
    // The dead zone stops flicker; it does not pin the band forever.
    let held = bandFor(800, null)
    for (let step = 0; step < 40; step += 1) {
      held = bandFor(800 + step * 10, held.raw)
    }
    expect(held.band).not.toEqual(bandFor(800, null).band)
  })

  test("takes the first measurement, since there is nothing to keep", () => {
    expect(settleBand(null, { centre: 360, thickness: 80 })).toEqual({
      centre: 360,
      thickness: 80,
    })
  })
})

/*
 * Which remembered waypoint may be restored after a remount.
 *
 * Kept separate from the effect that does it so the rules can be read: a
 * document with fewer waypoints than the number we remembered is a different
 * document, and restoring into it would land somewhere arbitrary.
 */
describe("restorableIndex", () => {
  test("restores a waypoint the reader was actually on", () => {
    expect(restorableIndex(7, 24)).toBe(7)
  })

  test("restores nothing for the first waypoint, which is where a mount starts", () => {
    expect(restorableIndex(0, 24)).toBeNull()
  })

  test("restores nothing past the end of this document", () => {
    expect(restorableIndex(30, 24)).toBeNull()
    expect(restorableIndex(24, 24)).toBeNull()
  })

  test("restores nothing from a document with no waypoints", () => {
    expect(restorableIndex(3, 0)).toBeNull()
  })

  test("ignores a number that is not one", () => {
    expect(restorableIndex(-1, 24)).toBeNull()
    expect(restorableIndex(1.5, 24)).toBeNull()
  })
})
