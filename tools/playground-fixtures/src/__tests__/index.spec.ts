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
const POKEMON_FIXTURE = "demo-fastapi/implement-route-api-pokemon"

describe("getAllFixtureCases", () => {
  it("lists the folders of test-cases, in order", async () => {
    const cases = await getAllFixtureCases(TEST_CASES_PATH)

    expect(cases).toContain("demo-fastapi")
    expect(cases).toContain("demo-react")
    expect(cases).toStrictEqual([...cases].sort())
  })
})

describe("getFixtureRepository", () => {
  it("returns a case as a local git repository, with one pull request per snapshot", async () => {
    await expect(getFixtureRepository(TEST_CASES_PATH, "demo-fastapi")).resolves.toStrictEqual({
      name: "demo-fastapi",
      path: join(TEST_CASES_PATH, "demo-fastapi"),
      forge: "git",
      forgeSlug: null,
      problem: null,
      hasFollowedAuthors: true,
      targets: [
        {
          kind: "pull-request",
          number: 1,
          title: "Implement route /api/pokemon",
          branch: "implement-route-api-pokemon",
          author: "fixture-author",
          authorAvatarUrl: null,
          branchStatus: "no-review",
          isNew: false,
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    })
  })

  it.each(["demo-fastapi", "demo-react", "demo-vue"])("numbers the pull requests of %s in the order of the snapshots", async (caseName) => {
    const repository = await getFixtureRepository(TEST_CASES_PATH, caseName)
    const fixtureNames = await getAllReviewArtifactFixturesByCase(TEST_CASES_PATH, caseName)

    expect(repository.targets.map((target) => target.number)).toStrictEqual(fixtureNames.map((_name, position) => position + 1))
    expect(repository.targets.map((target) => `${caseName}/${target.branch}`)).toStrictEqual(fixtureNames)
  })

  it("returns a repository without pull requests for a case without snapshots", async () => {
    await expect(getFixtureRepository(TEST_CASES_PATH, "not-a-case")).resolves.toMatchObject({ targets: [] })
  })

  it.each(["../demo-fastapi", "demo-fastapi/repo"])("refuses %s", async (name) => {
    await expect(getFixtureRepository(TEST_CASES_PATH, name)).rejects.toThrow(UnknownFixtureCaseError)
  })
})

describe("getAllReviewArtifactFixturesByCase", () => {
  it("lists the snapshots of a case, each named after its case and its file", async () => {
    expect(await getAllReviewArtifactFixturesByCase(TEST_CASES_PATH, "demo-fastapi")).toStrictEqual([POKEMON_FIXTURE])
  })

  it("lists nothing for a case that does not exist", async () => {
    expect(await getAllReviewArtifactFixturesByCase(TEST_CASES_PATH, "not-a-case")).toStrictEqual([])
  })
})

describe("getReviewArtifactFixture", () => {
  it("returns a snapshot as a review artifact, with the context and the diagrams of each segment", async () => {
    const artifact = await getReviewArtifactFixture(TEST_CASES_PATH, POKEMON_FIXTURE)
    const routeSegment = artifact.segments[1]

    expect(artifact).toMatchObject({
      title: "Implement route /api/pokemon",
      status: "complete",
      commit: "2222222222222222222222222222222222222222",
      isSegmented: true,
      segments: [
        { id: "fixture-segment-1", title: "Groundwork for the new route handlers and service functions" },
        { id: "fixture-segment-2", title: "New route handlers, service functions and Pokemon model, modified app" },
      ],
    })
    expect(artifact.changedPaths).toContain("src/pokedex/main.py")
    expect(routeSegment.changedPaths).toContain("src/pokedex/pokemon/routes.py")
    expect(routeSegment.traceDiagram?.traceNodes.map((node) => node.codeBlocks[0].name)).toContain("read_all_pokemon")
    expect(routeSegment.traceDiagram?.astCodeGroup.codeBlocks).toContain(routeSegment.traceDiagram?.traceNodes[0].codeBlocks[0])
    expect(routeSegment.context).toContain("This segment adds an API that lists, reads, creates, updates and deletes Pokemon")
    expect(artifact.segments[0].blastDiagram?.nodes.map((node) => node.diffType)).toContain("added")
  })

  it("keeps the waypoints of the walkthrough without the links only the codegraph has", async () => {
    const artifact = await getReviewArtifactFixture(TEST_CASES_PATH, POKEMON_FIXTURE)

    const [file] = artifact.segments[0].walkthrough.files

    expect(Object.keys(file)).toStrictEqual(["path", "waypoints"])
    expect(file.waypoints.map((waypoint) => Object.keys(waypoint))).toStrictEqual(
      file.waypoints.map(() => ["id", "title", "declaration", "codeBlocks", "reading", "coreChange", "findings", "children", "isRequired"]),
    )
    expect(file.waypoints.slice(0, 2).map((waypoint) => [waypoint.id, waypoint.declaration])).toStrictEqual([["w1", "POKEMON_TYPES"], ["w2", "PokemonCreate"]])
  })

  it("gives each changed file its lines after the change, marked from the diff, and where each waypoint is", async () => {
    const { sources } = await getReviewArtifactFixture(TEST_CASES_PATH, POKEMON_FIXTURE)
    const source = sources.find((candidate) => candidate.path === "src/pokedex/main.py")

    expect(source).toMatchObject({ path: "src/pokedex/main.py", language: "python" })
    expect(source?.lines.filter((line) => line.mark !== "context")).toStrictEqual([
      { text: "from pokedex.pokemon.routes import router as pokemon_router", mark: "added", number: 6 },
      { text: "app.include_router(pokemon_router, prefix=\"/api\", dependencies=[Depends(verify_api_key)])", mark: "added", number: 16 },
    ])
    expect(source?.lines.filter((line) => line.mark === "context").length).toBeGreaterThan(0)
  })

  it("marks an artifact complete when every segment of its snapshot is titled", async () => {
    const artifact = await getReviewArtifactFixture(TEST_CASES_PATH, "demo-react/implement-page-pokemonpage")

    expect(artifact.status).toBe("complete")
    expect(artifact.segments.every((segment) => segment.title !== "")).toBe(true)
  })

  it("reads every fixture of every case as an artifact the production schema accepts", async () => {
    const cases = await getAllFixtureCases(TEST_CASES_PATH)
    const names = (await Promise.all(cases.map(async (caseName) => await getAllReviewArtifactFixturesByCase(TEST_CASES_PATH, caseName)))).flat()
    const fixtures = await Promise.all(names.map(async (name) => await getReviewArtifactFixture(TEST_CASES_PATH, name)))

    expect(fixtures.map((fixture) => reviewArtifactSchema.safeParse(fixture).success)).toStrictEqual(names.map(() => true))
  })

  it.each(["demo-fastapi/not-a-fixture", "not-a-fixture", "../demo-fastapi/secret", "demo-fastapi/../../package"])(
    "refuses %s",
    async (name) => {
      await expect(getReviewArtifactFixture(TEST_CASES_PATH, name)).rejects.toThrow(UnknownFixtureError)
    },
  )
})
