import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  getAllFixtureCases,
  getAllReviewArtifactFixturesByCase,
  getFixtureRepository,
  getReviewArtifactFixture,
  UnknownFixtureCaseError,
  UnknownFixtureError,
} from "@/index"
import { reviewArtifactSchema } from "@flightplan/configurations"

const TEST_CASES_PATH = fileURLToPath(new URL("../../test-cases", import.meta.url))
const STOCK_FIXTURE = "typescript/modified-function-stockof-to-subtract-held-stock"

describe("getAllFixtureCases", () => {
  it("lists the folders of test-cases, in order", async () => {
    const cases = await getAllFixtureCases(TEST_CASES_PATH)

    expect(cases).toContain("typescript")
    expect(cases).toContain("react-spa-query-zustand")
    expect(cases).toStrictEqual([...cases].sort())
  })
})

describe("getFixtureRepository", () => {
  it("returns a case as a local git repository, with one pull request per snapshot", async () => {
    await expect(getFixtureRepository(TEST_CASES_PATH, "typescript")).resolves.toStrictEqual({
      name: "typescript",
      path: join(TEST_CASES_PATH, "typescript"),
      forge: "git",
      forgeSlug: null,
      problem: null,
      hasFollowedAuthors: true,
      targets: [
        {
          kind: "pull-request",
          number: 1,
          title: "Modified function stockOf to subtract held stock",
          branch: "modified-function-stockof-to-subtract-held-stock",
          author: "fixture-author",
          authorAvatarUrl: null,
          branchStatus: "no-review",
          isNew: false,
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    })
  })

  it("numbers the pull requests in the order of the snapshots", async () => {
    const repository = await getFixtureRepository(TEST_CASES_PATH, "react-spa-query-zustand")
    const fixtureNames = await getAllReviewArtifactFixturesByCase(TEST_CASES_PATH, "react-spa-query-zustand")

    expect(repository.targets.map((target) => target.number)).toStrictEqual(fixtureNames.map((_name, position) => position + 1))
    expect(repository.targets.map((target) => `react-spa-query-zustand/${target.branch}`)).toStrictEqual(fixtureNames)
  })

  it("returns a repository without pull requests for a case without snapshots", async () => {
    await expect(getFixtureRepository(TEST_CASES_PATH, "not-a-case")).resolves.toMatchObject({ targets: [] })
  })

  it.each(["../typescript", "typescript/repo"])("refuses %s", async (name) => {
    await expect(getFixtureRepository(TEST_CASES_PATH, name)).rejects.toThrow(UnknownFixtureCaseError)
  })
})

describe("getAllReviewArtifactFixturesByCase", () => {
  it("lists the snapshots of a case, each named after its case and its file", async () => {
    expect(await getAllReviewArtifactFixturesByCase(TEST_CASES_PATH, "typescript")).toStrictEqual([STOCK_FIXTURE])
  })

  it("lists every snapshot of a case with many", async () => {
    const fixtures = await getAllReviewArtifactFixturesByCase(TEST_CASES_PATH, "react-spa-query-zustand")

    expect(fixtures).toContain("react-spa-query-zustand/implement-page-wishlist")
    expect(fixtures.every((fixture) => fixture.startsWith("react-spa-query-zustand/"))).toBe(true)
  })

  it("lists nothing for a case that does not exist", async () => {
    expect(await getAllReviewArtifactFixturesByCase(TEST_CASES_PATH, "not-a-case")).toStrictEqual([])
  })
})

describe("getReviewArtifactFixture", () => {
  it("returns a snapshot as a review artifact, with its context and its diagrams in one segment", async () => {
    const artifact = await getReviewArtifactFixture(TEST_CASES_PATH, STOCK_FIXTURE)

    expect(artifact).toMatchObject({
      title: "Modified function stockOf to subtract held stock",
      status: "drafting",
      commit: "2222222222222222222222222222222222222222",
      isSegmented: false,
      changedPaths: ["src/inventory/stock.ts"],
      segments: [
        {
          id: "fixture-segment-1",
          title: "",
          changedPaths: ["src/inventory/stock.ts"],
          journey: { id: "journey:src/inventory/stock.ts#heldBySku" },
          journeyAbsence: null,
          blastAbsence: null,
        },
      ],
    })
    expect(artifact.segments[0].context.split("\n")[0]).toBe("## Summary")
    expect(artifact.segments[0].blast?.nodes.map((node) => node.ring)).toContain(0)
  })

  it("keeps the waypoints of the walkthrough without the links only the codegraph has", async () => {
    const artifact = await getReviewArtifactFixture(TEST_CASES_PATH, STOCK_FIXTURE)

    expect(artifact.segments[0].walkthrough.files).toStrictEqual([
      {
        path: "src/inventory/stock.ts",
        title: "src/inventory/stock.ts",
        summary: [],
        waypoints: [
          { id: "w1", title: null, declaration: "heldBySku", reading: "", needsAttention: null, findings: [], children: [] },
          { id: "w2", title: null, declaration: "stockOf", reading: "", needsAttention: null, findings: [], children: [] },
        ],
      },
    ])
  })

  it("gives each changed file its lines after the change, marked from the diff, and where each waypoint is", async () => {
    const [source] = (await getReviewArtifactFixture(TEST_CASES_PATH, STOCK_FIXTURE)).sources

    expect(source).toMatchObject({
      path: "src/inventory/stock.ts",
      language: "typescript",
      declarations: { heldBySku: { lineStart: 2, lineEnd: 2 }, stockOf: { lineStart: 4, lineEnd: 6 } },
    })
    expect(source.lines.filter((line) => line.mark !== "context")).toStrictEqual([
      { text: "const heldBySku: Record<string, number> = { \"tea-01\": 2 };", mark: "added", number: 2 },
      { text: "  return stockBySku[sku] ?? 0;", mark: "removed", number: null },
      { text: "  return (stockBySku[sku] ?? 0) - (heldBySku[sku] ?? 0);", mark: "added", number: 5 },
    ])
    expect(source.lines.filter((line) => line.mark === "context").length).toBeGreaterThan(0)
  })

  it("marks an artifact complete when every segment of its snapshot is titled", async () => {
    const artifact = await getReviewArtifactFixture(TEST_CASES_PATH, "react-spa-query-zustand/modified-function-formatprice-to-round-to-the-nearest-cent")

    expect(artifact.status).toBe("complete")
    expect(artifact.segments.every((segment) => segment.title !== "")).toBe(true)
  })

  it("reads every fixture a case lists as an artifact the production schema accepts", async () => {
    const names = await getAllReviewArtifactFixturesByCase(TEST_CASES_PATH, "react-spa-query-zustand")
    const fixtures = await Promise.all(names.map(async (name) => await getReviewArtifactFixture(TEST_CASES_PATH, name)))

    expect(fixtures.map((fixture) => reviewArtifactSchema.safeParse(fixture).success)).toStrictEqual(names.map(() => true))
  })

  it.each(["typescript/not-a-fixture", "not-a-fixture", "../typescript/secret", "typescript/../../package"])(
    "refuses %s",
    async (name) => {
      await expect(getReviewArtifactFixture(TEST_CASES_PATH, name)).rejects.toThrow(UnknownFixtureError)
    },
  )
})
