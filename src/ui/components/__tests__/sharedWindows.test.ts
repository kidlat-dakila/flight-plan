import { describe, expect, test } from "vitest"
import { sharedWindows, type WindowedStep } from "../Walkthrough"

/*
 * The slice a run of waypoints is drawn in.
 *
 * Full screen gives a run of waypoints on one file a single panel, and a panel
 * shows one slice of a file — so waypoints that share a panel have to be
 * windowed together. Below six hundred lines this decides nothing, because the
 * file is shown whole either way; above it, it is the difference between one
 * panel and two.
 */
describe("sharedWindows", () => {
  const step = (over: Partial<WindowedStep>): WindowedStep => ({
    path: "src/a.ts",
    focus: { from: 100, to: 110 },
    proposal: false,
    total: 2000,
    ...over,
  })

  test("gives a run one window covering all of it", () => {
    const [first, second] = sharedWindows([
      step({ focus: { from: 100, to: 110 } }),
      step({ focus: { from: 200, to: 210 } }),
    ])
    // Sixty either side of 100‥210, which is what a panel showing both needs.
    expect(first).toEqual({ from: 40, to: 270 })
    expect(second).toEqual(first)
  })

  test("leaves a waypoint on its own to choose for itself", () => {
    // Null is "ask `chooseWindow`", which is what reading one waypoint wants.
    expect(sharedWindows([step({})])).toEqual([null])
  })

  test("changes nothing for a file shown whole", () => {
    // Every waypoint already gets the whole file, which is exactly why they
    // were rendering as identical panels.
    const windows = sharedWindows([step({ total: 200 }), step({ total: 200 })])
    expect(windows).toEqual([
      { from: 1, to: 200 },
      { from: 1, to: 200 },
    ])
  })

  test("cuts a run when one window would be too much file", () => {
    // Eight hundred lines apart: one panel would render every line between
    // them. They stay two panels, each windowed on its own lines.
    expect(
      sharedWindows([
        step({ focus: { from: 100, to: 110 } }),
        step({ focus: { from: 1200, to: 1210 } }),
      ]),
    ).toEqual([null, null])
  })

  test("keeps a run going after a cut", () => {
    const windows = sharedWindows([
      step({ focus: { from: 100, to: 110 } }),
      step({ focus: { from: 1200, to: 1210 } }),
      step({ focus: { from: 1220, to: 1230 } }),
    ])
    expect(windows[0]).toBeNull()
    expect(windows[1]).toEqual({ from: 1140, to: 1290 })
    expect(windows[2]).toEqual(windows[1])
  })

  test("does not join two files", () => {
    expect(sharedWindows([step({}), step({ path: "src/b.ts" })])).toEqual([null, null])
  })

  test("does not join across a proposal", () => {
    const windows = sharedWindows([step({}), step({ proposal: true }), step({})])
    expect(windows).toEqual([null, null, null])
  })

  test("leaves out a file that could not be read", () => {
    // Nothing to window against, so nothing to share.
    expect(sharedWindows([step({ total: 0 }), step({ total: 0 })])).toEqual([null, null])
  })

  test("windows a run around a whole-file waypoint", () => {
    // One member is about the file rather than a range, so the run is too.
    const windows = sharedWindows([step({ focus: null }), step({ focus: null })])
    expect(windows[0]).toEqual({ from: 1, to: 600 })
  })
})
