import { traceFixtureEntriesSchema, traceFixturePageSchema } from "@/app/trace-fixture-schemas"
import { traceFixtureLoader } from "@/server/trace-fixture-loader"

const LAB_FIXTURE_ID = "lab/express-api/implement-route-patch-tasks-id-complete"

describe("traceFixtureLoader", () => {
  it("lists the fixtures it can read", async () => {
    const entries = await traceFixtureLoader.listTraceFixtures()

    expect(entries.map((entry) => entry.id)).toContain(LAB_FIXTURE_ID)
  })

  it("reads a fixture as its entry and the Trace Band of each segment the review page shows", async () => {
    const fixturePage = await traceFixtureLoader.readTraceFixturePage(LAB_FIXTURE_ID)

    expect(fixturePage?.entry.id).toBe(LAB_FIXTURE_ID)
    expect(fixturePage?.page.segments.length).toBeGreaterThan(0)
    expect(fixturePage?.page.segments.every((segment) => segment.traceDiagram.diagram !== null || segment.traceDiagram.tabs.length > 0)).toBe(true)
    expect(Object.keys(fixturePage?.page.codeDefinitions ?? {}).length).toBeGreaterThan(0)
  })

  it("answers in the shape the page parses", async () => {
    const [entries, fixturePage] = await Promise.all([traceFixtureLoader.listTraceFixtures(), traceFixtureLoader.readTraceFixturePage(LAB_FIXTURE_ID)])

    expect(traceFixtureEntriesSchema.safeParse(JSON.parse(JSON.stringify(entries))).success).toBe(true)
    expect(traceFixturePageSchema.safeParse(JSON.parse(JSON.stringify(fixturePage))).error).toBeUndefined()
  })

  it("reads nothing for an unknown fixture", async () => {
    expect(await traceFixtureLoader.readTraceFixturePage("lab/express-api/missing")).toBeNull()
    expect(await traceFixtureLoader.readTraceFixturePage("not an id")).toBeNull()
  })
})
