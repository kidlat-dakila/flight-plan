import { labStatusOf, type LabRequests } from "@/app/lab-status"

const SETTLED = { isLoading: false, error: null }

const requestsOf = (overrides: Partial<LabRequests>): LabRequests => ({
  fixtures: SETTLED,
  fixtureCount: 3,
  page: SETTLED,
  segmentCount: 1,
  ...overrides,
})

describe("labStatusOf", () => {
  it("says nothing once a fixture with a segment is loaded", () => {
    expect(labStatusOf(requestsOf({}))).toBeNull()
  })

  it("says what is loading", () => {
    expect(labStatusOf(requestsOf({ fixtures: { isLoading: true, error: null }, fixtureCount: null }))).toBe("Loading the fixtures.")
    expect(labStatusOf(requestsOf({ page: { isLoading: true, error: null }, segmentCount: null }))).toBe("Loading the fixture.")
  })

  it("says why there is nothing to show", () => {
    expect(labStatusOf(requestsOf({ fixtureCount: 0 }))).toBe("There are no fixtures to show.")
    expect(labStatusOf(requestsOf({ segmentCount: 0 }))).toBe("This fixture has no segment to show.")
  })

  it("passes on the message of a failed request, the list's first", () => {
    expect(labStatusOf(requestsOf({ page: { isLoading: false, error: new Error("No trace fixture has the id x.") } }))).toBe("No trace fixture has the id x.")
    expect(labStatusOf(requestsOf({ fixtures: { isLoading: false, error: new Error("The list failed.") }, page: { isLoading: false, error: new Error("The page failed.") } }))).toBe("The list failed.")
  })
})
