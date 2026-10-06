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
  it("returns the whole content of a snapshot", async () => {
    const fixture = await getReviewArtifactFixture(TEST_CASES_PATH, STOCK_FIXTURE)

    expect(fixture.title).toBe("Modified function stockOf to subtract held stock")
    expect(fixture.context[0]).toBe("## Summary")
    expect(fixture.diff[0]).toBe("diff --git a/src/inventory/stock.ts b/src/inventory/stock.ts")
    expect(fixture.codegraph).toMatchObject({ segments: [{ title: null }] })
  })

  it("reads every fixture a case lists", async () => {
    const names = await getAllReviewArtifactFixturesByCase(TEST_CASES_PATH, "react-spa-query-zustand")
    const fixtures = await Promise.all(names.map(async (name) => await getReviewArtifactFixture(TEST_CASES_PATH, name)))

    expect(fixtures).toHaveLength(names.length)
  })

  it.each(["typescript/not-a-fixture", "not-a-fixture", "../typescript/secret", "typescript/../../package"])(
    "refuses %s",
    async (name) => {
      await expect(getReviewArtifactFixture(TEST_CASES_PATH, name)).rejects.toThrow(UnknownFixtureError)
    },
  )
})
