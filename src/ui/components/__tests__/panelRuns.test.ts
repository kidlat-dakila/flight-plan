import { describe, expect, it, test } from "vitest"
import { panelAnchorOf, panelRuns, type PanelStep } from "../panelRuns"

/*
 * Which waypoints share a panel in full screen.
 *
 * The case this exists for is the ordinary one: a walkthrough visits a file,
 * then visits it again in the next waypoint. Both panels showed the same lines
 * under the same path, and the second header read as a mistake.
 */
describe("panelRuns", () => {
  const step = (over: Partial<PanelStep>): PanelStep => ({
    filePath: "src/a.ts",
    fileStart: 1,
    value: "one\ntwo",
    ...over,
  })

  test("joins consecutive waypoints showing the same window", () => {
    expect(panelRuns([step({}), step({}), step({})])).toEqual([[0, 1, 2]])
  })

  test("keeps a different file apart", () => {
    expect(panelRuns([step({}), step({ filePath: "src/b.ts" })])).toEqual([[0], [1]])
  })

  test("keeps two windows on one file apart", () => {
    // Far apart in a long file: one panel would have to show every line
    // between them, which is not what either waypoint is about.
    expect(
      panelRuns([step({}), step({ fileStart: 900, value: "far\naway" })]),
    ).toEqual([[0], [1]])
  })

  test("does not gather a file the author came back to", () => {
    // The order waypoints are written in is the argument being made; three
    // panels here, not two, because a file sits between them.
    const runs = panelRuns([step({}), step({ filePath: "src/b.ts" }), step({})])
    expect(runs).toEqual([[0], [1], [2]])
  })

  test("leaves a proposal on its own", () => {
    // It renders lines the file does not have, so the panel beside it is a
    // different document under the same path.
    expect(panelRuns([step({}), step({ proposed: true })])).toEqual([[0], [1]])
    expect(panelRuns([step({ proposed: true }), step({})])).toEqual([[0], [1]])
  })

  test("leaves a fence carrying its own code on its own", () => {
    // No path, so there is nothing to be the same file as.
    expect(panelRuns([step({ filePath: null }), step({ filePath: null })])).toEqual([
      [0],
      [1],
    ])
  })

  test("gives every waypoint exactly one panel", () => {
    const steps = [step({}), step({ filePath: "src/b.ts" }), step({ filePath: "src/b.ts" })]
    expect(panelRuns(steps).flat()).toEqual([0, 1, 2])
  })

  test("answers an empty walkthrough with no panels", () => {
    expect(panelRuns([])).toEqual([])
  })
})

describe("panelAnchorOf", () => {
  it("should report the worst state of every card on a shared panel", () => {
    expect(panelAnchorOf([{ anchor: "matched" }, { anchor: "lost" }])).toEqual({ anchor: "lost", moved: false })
    expect(panelAnchorOf([{ anchor: "matched" }, { anchor: "repaired", shifted: 3 }])).toEqual({
      anchor: "repaired",
      shifted: 3,
      moved: true,
    })
  })

  it("should keep a repair visible beside a lost anchor", () => {
    expect(panelAnchorOf([{ anchor: "repaired", shifted: 3 }, { anchor: "lost" }])).toEqual({
      anchor: "lost",
      shifted: 3,
      moved: true,
    })
  })

  it("should say none for a panel with no code", () => {
    expect(panelAnchorOf([{}, { anchor: "none" }])).toEqual({ anchor: "none", moved: false })
  })
})
