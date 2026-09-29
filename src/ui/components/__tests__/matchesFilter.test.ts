import { describe, expect, test } from "vitest"
import { FILTER_KEYS, matchesFilter, type FilterKey } from "../waypointBox"

/**
 * What survives a filtered tour.
 *
 * One predicate answers this for two callers — the box, deciding whether to
 * draw itself, and the tour, deciding whether a file has anything left. They
 * must agree: a file kept for a waypoint whose box then hides is a panel of
 * code with nothing said about it, and no way for a reader to tell why.
 */
const of = (keys: FilterKey[]) => new Set(keys)

describe("matchesFilter", () => {
  test("an empty filter keeps everything, which is the off state", () => {
    expect(matchesFilter({}, of([]))).toBe(true)
    expect(matchesFilter({ needsAttention: "why" }, of([]))).toBe(true)
  })

  test("keeps a waypoint flagged for attention", () => {
    expect(matchesFilter({ needsAttention: "why" }, of(["attention"]))).toBe(true)
  })

  test("drops a waypoint carrying nothing", () => {
    expect(matchesFilter({}, of(["attention"]))).toBe(false)
  })

  test("keeps a waypoint whose finding is the kind asked for", () => {
    expect(matchesFilter({ findings: [{ kind: "bug" }] }, of(["bug"]))).toBe(true)
  })

  test("keeps a document-level finding of the kind asked for, whose card is the finding", () => {
    expect(matchesFilter({ badge: "bug" }, of(["bug"]))).toBe(true)
    expect(matchesFilter({ badge: "nit" }, of(["bug"]))).toBe(false)
    expect(matchesFilter({ badge: null }, of(["bug"]))).toBe(false)
  })

  test("drops a waypoint whose findings are all other kinds", () => {
    expect(matchesFilter({ findings: [{ kind: "nit" }] }, of(["bug"]))).toBe(false)
  })

  test("matches any of several ticked, not all of them", () => {
    // A reviewer asking for bugs and risks wants both lists, not the
    // waypoints that are somehow both at once.
    const filter = of(["bug", "risk"])
    expect(matchesFilter({ findings: [{ kind: "risk" }] }, filter)).toBe(true)
    expect(matchesFilter({ findings: [{ kind: "bug" }] }, filter)).toBe(true)
    expect(matchesFilter({ findings: [{ kind: "question" }] }, filter)).toBe(false)
  })

  test("attention and a kind are independent, so either can keep a waypoint", () => {
    const filter = of(["attention", "bug"])
    expect(matchesFilter({ needsAttention: "why" }, filter)).toBe(true)
    expect(matchesFilter({ findings: [{ kind: "bug" }] }, filter)).toBe(true)
  })

  test("a waypoint with several findings is kept on any one of them", () => {
    expect(
      matchesFilter({ findings: [{ kind: "nit" }, { kind: "bug" }] }, of(["bug"])),
    ).toBe(true)
  })

  test("every key the menu offers is one the predicate understands", () => {
    // The menu is built from FILTER_KEYS, so a key it offers and this does not
    // answer for would be a tick that silently empties the tour.
    for (const key of FILTER_KEYS) {
      const step =
        key === "attention"
          ? { needsAttention: "why" }
          : { findings: [{ kind: key }] }
      expect(matchesFilter(step, of([key]))).toBe(true)
    }
  })
})
