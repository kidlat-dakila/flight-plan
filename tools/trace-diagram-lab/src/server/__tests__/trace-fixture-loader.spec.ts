import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { onTestFinished } from "vitest"
import { playgroundEntriesSchema, playgroundPageSchema } from "@/app/playground-schemas"
import { traceFixtureEntriesSchema, traceFixturePageSchema } from "@/app/trace-fixture-schemas"
import { TRACE_FIXTURE_FOLDERS } from "@/fixtures"
import type { TraceFixtureLoader } from "@/server/trace-fixture-api"
import { createTraceFixtureLoader, traceFixtureLoader } from "@/server/trace-fixture-loader"
import { createCodeHighlighter } from "@flightplan/codegraph"

const LAB_FIXTURE_ID = "lab/express-api/implement-route-patch-tasks-id-complete"
const LAB_KIND = "express-api"
const PLAYGROUND_ID = "typescript/express"
const KIND_PARTS = ["repo", "snapshots", "code-blocks", "meta.json"]

const createPlaygroundLoader = async (): Promise<TraceFixtureLoader> => {
  const playgrounds = await mkdtemp(join(tmpdir(), "playground-loader-"))
  onTestFinished(async () => {
    await rm(playgrounds, { recursive: true, force: true })
  })
  await mkdir(join(playgrounds, PLAYGROUND_ID), { recursive: true })
  await Promise.all(KIND_PARTS.map(async (part) => {
    await symlink(join(TRACE_FIXTURE_FOLDERS.lab, LAB_KIND, part), join(playgrounds, PLAYGROUND_ID, part))
  }))
  return createTraceFixtureLoader(createCodeHighlighter(), { fixtures: TRACE_FIXTURE_FOLDERS, playgrounds })
}

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

describe("the playgrounds of traceFixtureLoader", () => {
  it("reads a playground as its entry and the Trace Band of each segment, in the shape the page parses", async () => {
    const loader = await createPlaygroundLoader()
    const [entries, playgroundPage] = await Promise.all([loader.listPlaygrounds(), loader.readPlaygroundPage(PLAYGROUND_ID)])

    expect(entries.map((entry) => entry.id)).toStrictEqual([PLAYGROUND_ID])
    expect(playgroundPage?.entry.id).toBe(PLAYGROUND_ID)
    expect(playgroundPage?.page.segments.length).toBeGreaterThan(0)
    expect(playgroundEntriesSchema.safeParse(JSON.parse(JSON.stringify(entries))).success).toBe(true)
    expect(playgroundPageSchema.safeParse(JSON.parse(JSON.stringify(playgroundPage))).error).toBeUndefined()
  })

  it("reads nothing for an unknown playground", async () => {
    const loader = await createPlaygroundLoader()

    expect(await loader.readPlaygroundPage("typescript/missing")).toBeNull()
    expect(await loader.readPlaygroundPage("not an id")).toBeNull()
  })
})
