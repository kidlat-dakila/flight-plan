import { describe, expect, test } from "vitest"
import { inheritedKinds, slugOf, type FindingKind } from "../anchor"

/*
 * Which kind colours each card's marks, and each card's anchor.
 *
 * A document-level finding is a card with a `badge`; the cards nested under it
 * carry none, and still belong to it, so a bug's trace is marked in the bug's
 * colour down to its last step. Levels: 3 for a card, 4 and 5 inside it.
 */
describe("inheritedKinds", () => {
  const kinds = (...steps: [number, FindingKind | null][]) =>
    inheritedKinds(steps.map(([level, badge]) => ({ level, badge })))

  test("a finding's cards inherit its kind, however deep", () => {
    expect(kinds([3, "bug"], [4, null], [5, null], [4, null])).toEqual(["bug", "bug", "bug", "bug"])
  })

  test("the next finding takes over from the one above it", () => {
    expect(kinds([3, "bug"], [4, null], [3, "nit"], [4, null])).toEqual(["bug", "bug", "nit", "nit"])
  })

  test("a waypoint in the tour has no kind, and the tour before a finding is unaffected", () => {
    expect(kinds([3, null], [4, null], [3, "risk"], [4, null])).toEqual([null, null, "risk", "risk"])
  })

  test("a card's own findings win over what it would inherit, highest first", () => {
    expect(
      inheritedKinds([
        { level: 3, badge: "nit" },
        { level: 4, badge: null, findings: [{ kind: "question" }, { kind: "bug" }] },
      ]),
    ).toEqual(["nit", "bug"])
  })
})

describe("slugOf", () => {
  test("lowercases, drops punctuation and joins words with hyphens", () => {
    expect(slugOf("`annotateRanges` drops the mapping")).toBe("annotateranges-drops-the-mapping")
    expect(slugOf("[Symbol.iterator] is the contract")).toBe("symboliterator-is-the-contract")
  })
})
