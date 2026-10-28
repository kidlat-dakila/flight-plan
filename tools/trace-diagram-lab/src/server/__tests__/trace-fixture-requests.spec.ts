import type { PlaygroundEntry, TraceFixtureEntry } from "@/fixtures"
import { playgroundPathOf, traceFixturePathOf, type PlaygroundPage, type TraceFixtureLoader, type TraceFixturePage } from "@/server/trace-fixture-api"
import { failureResponseOf, isTraceFixtureLoader, respondToTraceFixtureRoute, traceFixtureRouteOf } from "@/server/trace-fixture-requests"

const ENTRY: TraceFixtureEntry = {
  id: "lab/express-api/implement-route",
  source: "lab",
  kind: "express-api",
  name: "implement-route",
  title: "Implement route",
}

const EMPTY_PAGE = { segments: [], codeLinks: {}, codeDefinitions: {} }

const FIXTURE_PAGE: TraceFixturePage = { entry: ENTRY, page: EMPTY_PAGE }

const PLAYGROUND: PlaygroundEntry = {
  id: "typescript/react",
  language: "typescript",
  framework: "react",
  title: "React app with a todo list",
}

const PLAYGROUND_PAGE: PlaygroundPage = {
  entry: PLAYGROUND,
  cases: [{ id: PLAYGROUND.id, title: PLAYGROUND.title, caseTitle: "Add a done filter", page: EMPTY_PAGE }],
}

const createLoader = (): TraceFixtureLoader => ({
  listTraceFixtures: async () => await Promise.resolve([ENTRY]),
  readTraceFixturePage: async (id) => await Promise.resolve(id === ENTRY.id ? FIXTURE_PAGE : null),
  listPlaygrounds: async () => await Promise.resolve([PLAYGROUND]),
  readPlaygroundPage: async (id) => await Promise.resolve(id === PLAYGROUND.id ? PLAYGROUND_PAGE : null),
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

  it("routes the list of playgrounds and one playground by its language and framework", () => {
    expect(traceFixtureRouteOf("GET", "/api/playgrounds")).toStrictEqual({ kind: "playgrounds" })
    expect(traceFixtureRouteOf("GET", "/api/playgrounds/?fresh=1")).toStrictEqual({ kind: "playgrounds" })
    expect(traceFixtureRouteOf("GET", "/api/playgrounds/typescript/react")).toStrictEqual({ kind: "playground", id: PLAYGROUND.id })
    expect(traceFixtureRouteOf("GET", playgroundPathOf(PLAYGROUND.id))).toStrictEqual({ kind: "playground", id: PLAYGROUND.id })
  })

  it("leaves other paths, other methods and a broken encoding to the next handler", () => {
    expect(traceFixtureRouteOf("GET", "/playground/typescript/react")).toBeNull()
    expect(traceFixtureRouteOf("GET", "/api/playgrounds-other")).toBeNull()
    expect(traceFixtureRouteOf("POST", "/api/playgrounds")).toBeNull()
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

  it("answers the list of playgrounds with every playground", async () => {
    expect(await respondToTraceFixtureRoute({ kind: "playgrounds" }, createLoader())).toStrictEqual({ status: 200, body: [PLAYGROUND] })
  })

  it("answers a known playground with its entry and its page", async () => {
    expect(await respondToTraceFixtureRoute({ kind: "playground", id: PLAYGROUND.id }, createLoader())).toStrictEqual({ status: 200, body: PLAYGROUND_PAGE })
  })

  it("answers an unknown playground with not found", async () => {
    expect(await respondToTraceFixtureRoute({ kind: "playground", id: "typescript/missing" }, createLoader())).toStrictEqual({
      status: 404,
      body: { message: "No playground has the id typescript/missing." },
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
  it("accepts a value with every function and nothing less", () => {
    const { listTraceFixtures, readTraceFixturePage, listPlaygrounds } = createLoader()

    expect(isTraceFixtureLoader(createLoader())).toBe(true)
    expect(isTraceFixtureLoader({ listTraceFixtures })).toBe(false)
    expect(isTraceFixtureLoader({ listTraceFixtures, readTraceFixturePage, listPlaygrounds })).toBe(false)
    expect(isTraceFixtureLoader(null)).toBe(false)
  })
})
