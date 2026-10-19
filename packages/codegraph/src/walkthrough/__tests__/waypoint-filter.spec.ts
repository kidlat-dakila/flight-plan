import { createCodeBlock, createFinding, createWaypoint, PRICE_PATH } from "@/__tests__/review-fixture"
import type { RootBlockKey } from "@/walkthrough/root-blocks"
import { buildWaypointFilter, matchesFilter, selectFilterKeys } from "@/walkthrough/waypoint-filter"
import { waypointChangeOf, type FlatWaypoint } from "@/walkthrough/waypoints"
import type { LineMark, SourceLine, WaypointChange } from "@flightplan/configurations"

const flat = (waypoint: ReturnType<typeof createWaypoint>, change: WaypointChange | null = "modified", rootBlockKeys: readonly RootBlockKey[] = []): FlatWaypoint => ({
  waypoint,
  depth: 0,
  path: PRICE_PATH,
  fingerprint: waypoint.id,
  change,
  rootBlocks: [],
  rootBlockKeys,
})

const rowsMarked = (marks: readonly LineMark[]): SourceLine[] =>
  marks.map((mark, index) => ({ text: `line ${String(index)}`, mark, number: mark === "removed" ? null : index + 1 }))

const plain = flat(createWaypoint("plain", "a"))
const flagged = flat(createWaypoint("flagged", "b", { coreChange: "Slow down." }))
const buggy = flat(createWaypoint("buggy", "c", { findings: [createFinding("f1", "bug"), createFinding("f2", "nit")] }))

describe("waypointChangeOf", () => {
  const waypoint = createWaypoint("w", "priceOf")

  it("calls a waypoint added when every line of it is added", () => {
    expect(waypointChangeOf(waypoint, rowsMarked(["added", "added"]))).toBe("added")
  })

  it("calls a waypoint modified when it changes some of its lines", () => {
    expect(waypointChangeOf(waypoint, rowsMarked(["context", "added", "context"]))).toBe("modified")
    expect(waypointChangeOf(waypoint, rowsMarked(["removed", "added"]))).toBe("modified")
  })

  it("calls a waypoint removed when every code block of it is deleted code", () => {
    const deleted = createWaypoint("gone", "oldPrice", { codeBlocks: [createCodeBlock("old", PRICE_PATH, { type: "deleted" })] })

    expect(waypointChangeOf(deleted, rowsMarked(["removed", "removed", "context"]))).toBe("removed")
  })

  it("gives no change to a waypoint on lines the change leaves alone", () => {
    expect(waypointChangeOf(waypoint, rowsMarked(["context"]))).toBeNull()
    expect(waypointChangeOf(waypoint, [])).toBeNull()
  })
})

describe("selectFilterKeys", () => {
  it("keeps the known keys in menu order, then the root block keys in the order asked, and drops the rest", () => {
    expect(selectFilterKeys(["removed", "nit", "unknown", "core-change"])).toStrictEqual(["core-change", "nit", "removed"])
    expect(selectFilterKeys(["block:state:added", "bug", "block:gadget:added", "block:data-model:deleted", "block:state:added"])).toStrictEqual(["bug", "block:state:added", "block:data-model:deleted"])
    expect(selectFilterKeys(null)).toStrictEqual([])
  })
})

describe("matchesFilter", () => {
  it("shows every waypoint when nothing is ticked", () => {
    expect([plain, flagged, buggy].every((waypoint) => matchesFilter(waypoint, []))).toBe(true)
  })

  it("shows a waypoint that matches any ticked key", () => {
    expect(matchesFilter(flagged, ["core-change", "bug"])).toBe(true)
    expect(matchesFilter(buggy, ["core-change", "bug"])).toBe(true)
    expect(matchesFilter(plain, ["core-change", "bug"])).toBe(false)
    expect(matchesFilter(buggy, ["risk"])).toBe(false)
  })

  it("shows a waypoint of any ticked change type", () => {
    const added = flat(createWaypoint("new", "d"), "added")

    expect(matchesFilter(added, ["added", "removed"])).toBe(true)
    expect(matchesFilter(plain, ["added", "removed"])).toBe(false)
  })

  it("shows a waypoint whose root block matches a ticked code block, together with the ticked kinds", () => {
    const addedHook = flat(createWaypoint("hook", "useTotal"), "added", ["block:state:added"])
    const buggyHook = flat(createWaypoint("buggy-hook", "useCart", { findings: [createFinding("f4", "bug")] }), "modified", ["block:state:added"])

    expect(matchesFilter(addedHook, ["block:state:added", "block:data-model:modified"])).toBe(true)
    expect(matchesFilter(plain, ["block:state:added"])).toBe(false)
    expect(matchesFilter(buggyHook, ["bug", "block:state:added"])).toBe(true)
    expect(matchesFilter(addedHook, ["bug", "block:state:added"])).toBe(false)
  })

  it("asks a waypoint to match both the kinds and the change types when both are ticked", () => {
    const addedBug = flat(createWaypoint("new-bug", "e", { findings: [createFinding("f3", "bug")] }), "added")

    expect(matchesFilter(addedBug, ["bug", "added"])).toBe(true)
    expect(matchesFilter(buggy, ["bug", "added"])).toBe(false)
    expect(matchesFilter(flat(createWaypoint("new", "d"), "added"), ["bug", "added"])).toBe(false)
  })
})

const buildFilter = (waypoints: readonly FlatWaypoint[], selected: Parameters<typeof buildWaypointFilter>[1]) => buildWaypointFilter(waypoints, selected, [])

describe("buildWaypointFilter", () => {
  it("counts the waypoints each option matches, over the whole walkthrough", () => {
    const filter = buildFilter([plain, flagged, buggy], ["bug"])

    expect(filter.groups[0].options.map((option) => [option.key, option.detailLabel, option.isSelected])).toStrictEqual([
      ["core-change", "1 waypoint", false],
      ["bug", "1 waypoint", true],
      ["risk", "0 waypoints", false],
      ["nit", "1 waypoint", false],
      ["question", "0 waypoints", false],
    ])
    expect(filter).toMatchObject({ buttonLabel: "Filter", badge: { count: 1 } })
  })

  it("puts the change types in a submenu, counted over the whole walkthrough", () => {
    const added = flat(createWaypoint("new", "d"), "added")
    const filter = buildFilter([plain, flagged, added], ["added"])

    expect(filter.submenus.map((submenu) => [submenu.id, submenu.label, submenu.valueLabel])).toStrictEqual([["change", "Change type", "Added"]])
    expect(filter.submenus[0].options.map((option) => [option.key, option.detailLabel, option.isSelected])).toStrictEqual([
      ["added", "1 waypoint", true],
      ["modified", "2 waypoints", false],
      ["removed", "0 waypoints", false],
    ])
    expect(filter.submenus[0].options.find((option) => option.key === "removed")?.toggledKeys).toStrictEqual(["added", "removed"])
  })

  it("gives each option the keys selected after it is toggled", () => {
    const filter = buildFilter([plain], ["bug"])

    expect(filter.groups[0].options.find((option) => option.key === "bug")?.toggledKeys).toStrictEqual([])
    expect(filter.groups[0].options.find((option) => option.key === "nit")?.toggledKeys).toStrictEqual(["bug", "nit"])
    expect(buildFilter([plain], [])).toMatchObject({ buttonLabel: "Filter", badge: null })
  })

  it("lists the four code blocks with the most waypoints by their type and what happened to them, and the others under More", () => {
    const withBlocks = (id: string, ...keys: RootBlockKey[]) => flat(createWaypoint(id, id), "modified", keys)
    const waypoints = [
      withBlocks("a", "block:page:added", "block:state:modified"),
      withBlocks("b", "block:page:added"),
      withBlocks("c", "block:component:modified"),
      withBlocks("d", "block:data-model:deleted"),
      withBlocks("e", "block:config:added"),
      withBlocks("f", "block:state:modified"),
    ]
    const [, blocks] = buildFilter(waypoints, []).groups

    expect(blocks.options.map((option) => [option.label, option.detailLabel, option.detailChange])).toStrictEqual([
      ["Page", "Added", "added"],
      ["State", "Modified", "modified"],
      ["Component", "Modified", "modified"],
      ["Data model", "Deleted", "deleted"],
    ])
    expect(blocks.more).toMatchObject({ label: "More", heading: "Code blocks", valueLabel: null, options: [{ label: "Config", detailLabel: "Added" }] })
  })

  it("puts the classifications of the user's spotlight first, and never under More", () => {
    const withBlocks = (id: string, ...keys: RootBlockKey[]) => flat(createWaypoint(id, id), "modified", keys)
    const waypoints = [
      withBlocks("a", "block:page:added", "block:state:modified"),
      withBlocks("b", "block:page:added"),
      withBlocks("c", "block:component:modified"),
      withBlocks("d", "block:data-model:deleted"),
      withBlocks("e", "block:config:added"),
      withBlocks("f", "block:state:modified"),
    ]
    const [, blocks] = buildWaypointFilter(waypoints, [], ["config", "data-model"]).groups

    expect(blocks.options.map((option) => option.key)).toStrictEqual([
      "block:data-model:deleted",
      "block:config:added",
      "block:page:added",
      "block:state:modified",
      "block:component:modified",
    ])
    expect(blocks.more).toBeNull()
  })

  it("keeps a ticked code block among the first, and has no More when every code block fits", () => {
    const waypoints = ["a", "b", "c", "d", "e"].map((id, index) =>
      flat(createWaypoint(id, id), "modified", index === 4 ? ["block:config:added"] : ["block:page:added", `block:${(["state", "data-model", "component", "page"] as const)[index]}:modified`]))
    const [, ticked] = buildFilter(waypoints, ["block:config:added"]).groups

    expect(ticked.options.map((option) => option.key)).toContain("block:config:added")
    expect(buildFilter([flat(createWaypoint("one", "a"), "added", ["block:state:added"])], []).groups[1].more).toBeNull()
  })

  it("counts every ticked filter in a badge after the button, one included, and leaves the Reviewed tick out", () => {
    expect(buildFilter([plain], ["bug"]).badge).toStrictEqual({ count: 1, label: "1 filter" })
    expect(buildFilter([plain], ["bug", "block:state:added", "added"]).badge).toStrictEqual({ count: 3, label: "3 filters" })
    expect(buildFilter([plain], []).badge).toBeNull()
    expect(buildFilter([plain], ["added", "removed"]).submenus[0].valueLabel).toBe("Added, Removed")
  })
})
