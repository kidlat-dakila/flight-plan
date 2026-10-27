import { chosenOf, diagramOptionsOf, fixtureLabelOf, fixtureOptionsOf, labSelectionOfSearch, nextIdOf, previousIdOf, searchOfLabSelection } from "@/app/lab-selection"

const ENTRIES = [
  { id: "playground/demo-fastapi/route", source: "playground", kind: "demo-fastapi", name: "route", title: "Implement a route" },
  { id: "playground/demo-nextjs/page", source: "playground", kind: "demo-nextjs", name: "page", title: "Add a page" },
  { id: "lab/express-api/complete", source: "lab", kind: "express-api", name: "complete", title: "Complete a task" },
]

describe("labSelectionOfSearch", () => {
  it("reads the fixture, the segment and the tab of the address", () => {
    expect(labSelectionOfSearch("?fixture=lab%2Fexpress-api%2Fcomplete&segment=segment-2&tab=checkout")).toStrictEqual({
      fixtureId: "lab/express-api/complete",
      segmentId: "segment-2",
      tabId: "checkout",
    })
  })

  it("reads no choice from an address without one", () => {
    expect(labSelectionOfSearch("")).toStrictEqual({ fixtureId: null, segmentId: null, tabId: null })
  })
})

describe("searchOfLabSelection", () => {
  it("writes back what labSelectionOfSearch reads", () => {
    const selection = { fixtureId: "lab/express-api/complete", segmentId: "segment-2", tabId: "checkout" }

    expect(labSelectionOfSearch(searchOfLabSelection(selection))).toStrictEqual(selection)
  })

  it("leaves out what was not chosen", () => {
    expect(searchOfLabSelection({ fixtureId: "lab/express-api/complete", segmentId: null, tabId: null })).toBe("?fixture=lab%2Fexpress-api%2Fcomplete")
    expect(searchOfLabSelection({ fixtureId: null, segmentId: null, tabId: null })).toBe("")
  })
})

describe("chosenOf", () => {
  it("chooses the requested item", () => {
    expect(chosenOf(ENTRIES, "playground/demo-nextjs/page")).toBe(ENTRIES[1])
  })

  it("falls back to the first item when nothing or an unknown item is requested", () => {
    expect(chosenOf(ENTRIES, null)).toBe(ENTRIES[0])
    expect(chosenOf(ENTRIES, "lab/express-api/missing")).toBe(ENTRIES[0])
  })

  it("chooses nothing from no items", () => {
    expect(chosenOf([], "lab/express-api/complete")).toBeNull()
  })
})

describe("previousIdOf and nextIdOf", () => {
  it("step to the neighbours of the current item", () => {
    expect(previousIdOf(ENTRIES, "playground/demo-nextjs/page")).toBe("playground/demo-fastapi/route")
    expect(nextIdOf(ENTRIES, "playground/demo-nextjs/page")).toBe("lab/express-api/complete")
  })

  it("stop at the ends instead of wrapping around", () => {
    expect(previousIdOf(ENTRIES, "playground/demo-fastapi/route")).toBeNull()
    expect(nextIdOf(ENTRIES, "lab/express-api/complete")).toBeNull()
  })

  it("step nowhere from an item that is not listed", () => {
    expect(previousIdOf(ENTRIES, null)).toBeNull()
    expect(nextIdOf(ENTRIES, "lab/express-api/missing")).toBeNull()
  })
})

describe("options", () => {
  it("labels a fixture with its source, its kind and its title", () => {
    expect(fixtureLabelOf(ENTRIES[2])).toBe("lab / express-api / Complete a task")
    expect(fixtureOptionsOf(ENTRIES).map((option) => option.value)).toStrictEqual(ENTRIES.map((entry) => entry.id))
  })

  it("offers each diagram by its id with its label", () => {
    expect(diagramOptionsOf([{ id: "segment-1/stock", label: "Stock check" }])).toStrictEqual([{ value: "segment-1/stock", label: "Stock check" }])
  })
})
