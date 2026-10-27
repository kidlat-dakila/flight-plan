import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { onTestFinished } from "vitest"
import { listTraceFixtures, readTraceFixture, TRACE_FIXTURE_FOLDERS } from "@/fixtures"
import { reviewArtifactSchema } from "@flightplan/configurations"
import { getReviewArtifactFixture } from "@flightplan/playground-fixtures"

const LAB_FIXTURE_ID = "lab/express-api/implement-route-patch-tasks-id-complete"
const PLAYGROUND_FIXTURE_ID = "playground/demo-fastapi/implement-route-api-pokemon"

const createEmptyFolder = async (): Promise<string> => {
  const folder = await mkdtemp(join(tmpdir(), "trace-fixtures-"))
  onTestFinished(async () => {
    await rm(folder, { recursive: true, force: true })
  })
  return folder
}

const byKindThenName = (one: { readonly kind: string, readonly name: string }, two: { readonly kind: string, readonly name: string }): number =>
  one.kind.localeCompare(two.kind) || one.name.localeCompare(two.name)

describe("listTraceFixtures", () => {
  it("lists a lab case with its title", async () => {
    const fixtures = await listTraceFixtures()

    expect(fixtures).toContainEqual({
      id: LAB_FIXTURE_ID,
      source: "lab",
      kind: "express-api",
      name: "implement-route-patch-tasks-id-complete",
      title: "Implement route PATCH /tasks/:id/complete",
    })
  })

  it("lists a playground case with its title", async () => {
    const fixtures = await listTraceFixtures()

    expect(fixtures).toContainEqual({
      id: PLAYGROUND_FIXTURE_ID,
      source: "playground",
      kind: "demo-fastapi",
      name: "implement-route-api-pokemon",
      title: "Implement route /api/pokemon",
    })
  })

  it("lists the playground fixtures first, then the lab fixtures, each by kind then name", async () => {
    const fixtures = await listTraceFixtures()
    const playground = fixtures.filter((fixture) => fixture.source === "playground")
    const lab = fixtures.filter((fixture) => fixture.source === "lab")

    expect(fixtures).toStrictEqual([...playground, ...lab])
    expect(playground).toStrictEqual([...playground].sort(byKindThenName))
    expect(lab).toStrictEqual([...lab].sort(byKindThenName))
  })

  it("names each fixture by its source, its kind and its snapshot", async () => {
    const fixtures = await listTraceFixtures()

    expect(fixtures.map(({ id }) => id)).toStrictEqual(fixtures.map(({ source, kind, name }) => `${source}/${kind}/${name}`))
  })

  it("lists no lab fixture from a kind with no snapshot", async () => {
    const lab = await createEmptyFolder()
    await mkdir(join(lab, "empty-kind", "repo"), { recursive: true })

    const fixtures = await listTraceFixtures({ ...TRACE_FIXTURE_FOLDERS, lab })

    expect(fixtures.filter((fixture) => fixture.source === "lab")).toStrictEqual([])
  })
})

describe("readTraceFixture", () => {
  it("reads a playground fixture as the playground does", async () => {
    const artifact = await readTraceFixture(PLAYGROUND_FIXTURE_ID)
    const fixture = await getReviewArtifactFixture(TRACE_FIXTURE_FOLDERS.playground, "demo-fastapi/implement-route-api-pokemon")

    expect(artifact?.title).toBe(fixture.title)
    expect(artifact?.sources).toStrictEqual(fixture.sources)
    expect(artifact?.segments.map((segment) => segment.traceDiagram?.traceNodes.map((node) => node.id))).toStrictEqual(
      fixture.segments.map((segment) => segment.traceDiagram?.traceNodes.map((node) => node.id)),
    )
  })

  it("reads a lab fixture as a review artifact", async () => {
    const artifact = await readTraceFixture(LAB_FIXTURE_ID)

    expect(reviewArtifactSchema.safeParse(artifact).success).toBe(true)
    expect(artifact?.title).toBe("Implement route PATCH /tasks/:id/complete")
  })

  it("reads the trace of a lab fixture with its written parts", async () => {
    const artifact = await readTraceFixture(LAB_FIXTURE_ID)
    const traceDiagram = artifact?.segments[0]?.traceDiagram

    expect(traceDiagram?.title).toBe("Complete task request flow diagram")
    expect(traceDiagram?.traceNodes.map((node) => node.children.length)).toStrictEqual([0, 0, 0, 1])
  })

  it("reads the waypoints of a lab fixture with no prose", async () => {
    const artifact = await readTraceFixture(LAB_FIXTURE_ID)
    const waypoints = artifact?.segments[0]?.walkthrough.files.flatMap((file) => file.waypoints) ?? []

    expect(waypoints.map(({ title, reading, coreChange, findings }) => ({ title, reading, coreChange, findings }))).toStrictEqual(
      waypoints.map(() => ({ title: null, reading: "", coreChange: null, findings: [] })),
    )
  })

  it("reads the source lines of a lab fixture with the diff applied", async () => {
    const artifact = await readTraceFixture(LAB_FIXTURE_ID)
    const store = artifact?.sources.find((source) => source.path === "src/tasks/store.ts")

    expect(store?.lines.some((line) => line.mark === "added" && line.text.includes("saveTask"))).toBe(true)
  })

  it.each([
    "lab/express-api/no-such-snapshot",
    "lab/no-such-kind/implement-route-patch-tasks-id-complete",
    "playground/demo-fastapi/no-such-snapshot",
    "playground/no-such-kind/implement-route-api-pokemon",
    "elsewhere/express-api/implement-route-patch-tasks-id-complete",
    "lab/../cases/implement-route-patch-tasks-id-complete",
    "express-api/implement-route-patch-tasks-id-complete",
  ])("returns null for %s, which names no fixture", async (id) => {
    await expect(readTraceFixture(id)).resolves.toBeNull()
  })
})
