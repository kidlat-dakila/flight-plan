import { firstUnreviewedWaypointIdOf, isFilterApplied, tickedFilterKeysOf, type FilteredSegment } from "@/routes/pr-reviews/$repoName/-hooks/filtered-waypoints"

const option = (key: string, isSelected: boolean) => ({
  key,
  label: key,
  detailLabel: "",
  detailChange: null,
  isSelected,
  toggledKeys: [],
})

const filterTicking = (keys: readonly string[]) => {
  const optionOf = (key: string) => option(key, keys.includes(key))
  return {
    buttonLabel: "Filter",
    badge: null,
    heading: "Show waypoints with",
    groups: [
      { id: "finding", options: ["bug", "nit"].map(optionOf), more: null },
      { id: "block", options: ["block:logic:added"].map(optionOf), more: { id: "more", label: "More", heading: "Code blocks", valueLabel: null, options: ["block:ui-state:modified"].map(optionOf) } },
    ],
    submenus: [{ id: "change", label: "Change type", heading: "Change type", valueLabel: null, options: ["added", "modified", "removed"].map(optionOf) }],
  }
}

const waypointRow = (id: string, isReviewed: boolean) => ({ kind: "waypoint" as const, waypoint: { id, isReviewed } })

const segmentOf = (keys: readonly string[], rows: FilteredSegment["walkthrough"]["files"][number]["rows"]): FilteredSegment => ({
  walkthrough: {
    controls: {
      filter: filterTicking(keys),
      reviewedToggle: { label: "Reviewed", countLabel: "", isShown: false, isAvailable: false },
      stepping: { previousLabel: "Previous waypoint", nextLabel: "Next waypoint" },
      currentReview: { markLabel: "Mark as reviewed", reviewedLabel: "Reviewed" },
    },
    files: [{ rows }],
  },
})

describe("tickedFilterKeysOf", () => {
  it("lists the ticks of every group, of More and of every submenu", () => {
    expect(tickedFilterKeysOf(filterTicking(["nit", "block:ui-state:modified", "removed"]))).toStrictEqual(["nit", "block:ui-state:modified", "removed"])
    expect(tickedFilterKeysOf(filterTicking([]))).toStrictEqual([])
  })
})

describe("isFilterApplied", () => {
  it("says the page shows the filter asked for once every segment ticks the same keys, in any order", () => {
    const segments = [segmentOf(["bug", "added"], []), segmentOf(["bug", "added"], [])]

    expect(isFilterApplied(segments, ["added", "bug"])).toBe(true)
    expect(isFilterApplied(segments, ["bug"])).toBe(false)
    expect(isFilterApplied([segmentOf([], [])], [])).toBe(true)
  })
})

describe("firstUnreviewedWaypointIdOf", () => {
  it("finds the first waypoint not reviewed yet in page order, across segments", () => {
    const segments = [
      segmentOf([], [{ kind: "lines" }, waypointRow("done", true)]),
      segmentOf([], [{ kind: "gap" }, waypointRow("next", false), waypointRow("later", false)]),
    ]

    expect(firstUnreviewedWaypointIdOf(segments)).toBe("next")
  })

  it("finds nothing when every waypoint shown is reviewed", () => {
    expect(firstUnreviewedWaypointIdOf([segmentOf([], [waypointRow("done", true)])])).toBeNull()
    expect(firstUnreviewedWaypointIdOf([])).toBeNull()
  })
})
