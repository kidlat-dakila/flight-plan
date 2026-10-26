import type { TraceFixtureEntry } from "@/fixtures"
import { traceFixturePathOf, type TraceFixtureLoader, type TraceFixturePage } from "@/server/trace-fixture-api"
import { failureResponseOf, isTraceFixtureLoader, respondToTraceFixtureRoute, traceFixtureRouteOf } from "@/server/trace-fixture-requests"

const ENTRY: TraceFixtureEntry = {
  id: "lab/express-api/implement-route",
  source: "lab",
  kind: "express-api",
  name: "implement-route",
  title: "Implement route",
}

const FIXTURE_PAGE: TraceFixturePage = { entry: ENTRY, page: { segments: [], codeLinks: {}, codeDefinitions: {} } }

const createLoader = (): TraceFixtureLoader => ({
  listTraceFixtures: async () => await Promise.resolve([ENTRY]),
  readTraceFixturePage: async (id) => await Promise.resolve(id === ENTRY.id ? FIXTURE_PAGE : null),
})

describe("traceFixtureRouteOf", () => {
  it("routes the list of fixtures, with or without a trailing slash or a query", () => {
    expect(traceFixtureRouteOf("GET", "/api/trace-fixtures")).toStrictEqual({ kind: "list" })
    expect(traceFixtureRouteOf("GET", "/api/trace-fixtures/")).toStrictEqual({ kind: "list" })
    expect(traceFixtureRouteOf("GET", "/api/trace-fixtures?fresh=1")).toStrictEqual({ kind: "list" })
  })

  it("routes one fixture by the id after the path, slashes included", () => {
    expect(traceFixtureRouteOf("GET", "/api/trace-fixtures/lab/express-api/implement-route")).toStrictEqual({ kind: "fixture", id: ENTRY.id })
  })

  it("reads back the id that traceFixturePathOf encodes", () => {
    const id = "playground/demo kind/name#1"

    expect(traceFixtureRouteOf("GET", traceFixturePathOf(id))).toStrictEqual({ kind: "fixture", id })
  })

  it("leaves other paths, other methods and a broken encoding to the next handler", () => {
    expect(traceFixtureRouteOf("GET", "/src/main.tsx")).toBeNull()
    expect(traceFixtureRouteOf("GET", "/api/trace-fixtures-other")).toBeNull()
    expect(traceFixtureRouteOf("POST", "/api/trace-fixtures")).toBeNull()
    expect(traceFixtureRouteOf("GET", undefined)).toBeNull()
    expect(traceFixtureRouteOf("GET", "/api/trace-fixtures/%E0%A4%A")).toBeNull()
  })
})

describe("respondToTraceFixtureRoute", () => {
  it("answers the list with every entry", async () => {
    expect(await respondToTraceFixtureRoute({ kind: "list" }, createLoader())).toStrictEqual({ status: 200, body: [ENTRY] })
  })

  it("answers a known fixture with its entry and its page", async () => {
    expect(await respondToTraceFixtureRoute({ kind: "fixture", id: ENTRY.id }, createLoader())).toStrictEqual({ status: 200, body: FIXTURE_PAGE })
  })

  it("answers an unknown fixture with not found", async () => {
    expect(await respondToTraceFixtureRoute({ kind: "fixture", id: "lab/express-api/missing" }, createLoader())).toStrictEqual({
      status: 404,
      body: { message: "No trace fixture has the id lab/express-api/missing." },
    })
  })
})

describe("failureResponseOf", () => {
  it("answers a failure with its message", () => {
    expect(failureResponseOf(new Error("The snapshot is broken."))).toStrictEqual({ status: 500, body: { message: "The snapshot is broken." } })
    expect(failureResponseOf("broken")).toStrictEqual({ status: 500, body: { message: "The trace fixture could not be read." } })
  })
})

describe("isTraceFixtureLoader", () => {
  it("accepts a value with both functions and nothing less", () => {
    expect(isTraceFixtureLoader(createLoader())).toBe(true)
    expect(isTraceFixtureLoader({ listTraceFixtures: createLoader().listTraceFixtures })).toBe(false)
    expect(isTraceFixtureLoader(null)).toBe(false)
  })
})
