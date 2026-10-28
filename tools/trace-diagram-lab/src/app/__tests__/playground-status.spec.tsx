import type { ListedPageRequests } from "@/app/lab-status"
import { playgroundStatusOf } from "@/app/playground-status"

const SETTLED = { isLoading: false, error: null }

const requestsOf = (overrides: Partial<ListedPageRequests>): ListedPageRequests => ({
  list: SETTLED,
  listCount: 3,
  page: SETTLED,
  segmentCount: 1,
  ...overrides,
})

describe("playgroundStatusOf", () => {
  it("says nothing once a playground with a segment is loaded", () => {
    expect(playgroundStatusOf(requestsOf({}))).toBeNull()
  })

  it("says what is loading", () => {
    expect(playgroundStatusOf(requestsOf({ list: { isLoading: true, error: null }, listCount: null }))).toBe("Loading the playgrounds.")
    expect(playgroundStatusOf(requestsOf({ page: { isLoading: true, error: null }, segmentCount: null }))).toBe("Loading the playground.")
  })

  it("says why there is nothing to show", () => {
    expect(playgroundStatusOf(requestsOf({ listCount: 0 }))).toBe("There are no playgrounds to show.")
    expect(playgroundStatusOf(requestsOf({ segmentCount: 0 }))).toBe("This playground has no segment to show.")
  })

  it("passes on the message of a failed request", () => {
    expect(playgroundStatusOf(requestsOf({ page: { isLoading: false, error: new Error("No playground has the id x.") } }))).toBe("No playground has the id x.")
  })
})
