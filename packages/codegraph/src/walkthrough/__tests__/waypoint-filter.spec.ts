import { createFinding, createWaypoint } from "@/procedures/get-review/utils/__tests__/review-fixture"
import { buildWaypointFilter, matchesFilter, selectFilterKeys, type FlatWaypoint } from "@/procedures/get-review/utils/walkthrough/waypoints"

const flat = (waypoint: ReturnType<typeof createWaypoint>): FlatWaypoint => ({
  waypoint,
  depth: 0,
  path: "src/price.ts",
  fingerprint: waypoint.id,
})

const plain = flat(createWaypoint("plain", "a"))
const flagged = flat(createWaypoint("flagged", "b", { needsAttention: "Slow down." }))
const buggy = flat(createWaypoint("buggy", "c", { findings: [createFinding("f1", "bug"), createFinding("f2", "nit")] }))

describe("selectFilterKeys", () => {
  it("keeps the known keys in menu order and drops the rest", () => {
    expect(selectFilterKeys(["nit", "unknown", "attention"])).toStrictEqual(["attention", "nit"])
    expect(selectFilterKeys(null)).toStrictEqual([])
  })
})

describe("matchesFilter", () => {
  it("shows every waypoint when nothing is ticked", () => {
    expect([plain, flagged, buggy].every((waypoint) => matchesFilter(waypoint, []))).toBe(true)
  })

  it("shows a waypoint that matches any ticked key", () => {
    expect(matchesFilter(flagged, ["attention", "bug"])).toBe(true)
    expect(matchesFilter(buggy, ["attention", "bug"])).toBe(true)
    expect(matchesFilter(plain, ["attention", "bug"])).toBe(false)
    expect(matchesFilter(buggy, ["risk"])).toBe(false)
  })
})

describe("buildWaypointFilter", () => {
  it("counts the waypoints each option matches, over the whole walkthrough", () => {
    const filter = buildWaypointFilter([plain, flagged, buggy], ["bug"])

    expect(filter.options.map((option) => [option.key, option.countLabel, option.isSelected])).toStrictEqual([
      ["attention", "1 waypoint", false],
      ["bug", "1 waypoint", true],
      ["risk", "0 waypoints", false],
      ["nit", "1 waypoint", false],
      ["question", "0 waypoints", false],
    ])
    expect(filter).toMatchObject({ buttonLabel: "Filter: 1 of 5", isDefault: false })
  })

  it("gives each option the keys selected after it is toggled", () => {
    const filter = buildWaypointFilter([plain], ["bug"])

    expect(filter.options.find((option) => option.key === "bug")?.toggledKeys).toStrictEqual([])
    expect(filter.options.find((option) => option.key === "nit")?.toggledKeys).toStrictEqual(["bug", "nit"])
    expect(buildWaypointFilter([plain], [])).toMatchObject({ buttonLabel: "Filter: all waypoints", isDefault: true })
  })
})
