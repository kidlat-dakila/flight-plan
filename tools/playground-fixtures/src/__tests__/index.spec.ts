import {
  getAllFixtureCases,
  getAllReviewArtifactFixturesByCase,
  getReviewArtifactFixture,
  UnknownFixtureError,
} from "@/index"

const STOCK_FIXTURE = "typescript/modified-function-stockof-to-subtract-held-stock"

describe("getAllFixtureCases", () => {
  it("lists the folders of test-cases, in order", async () => {
    const cases = await getAllFixtureCases()

    expect(cases).toContain("typescript")
    expect(cases).toContain("react-spa-query-zustand")
    expect(cases).toStrictEqual([...cases].sort())
  })
})

describe("getAllReviewArtifactFixturesByCase", () => {
  it("lists the snapshots of a case, each named after its case and its file", async () => {
    expect(await getAllReviewArtifactFixturesByCase("typescript")).toStrictEqual([STOCK_FIXTURE])
  })

  it("lists every snapshot of a case with many", async () => {
    const fixtures = await getAllReviewArtifactFixturesByCase("react-spa-query-zustand")

    expect(fixtures).toContain("react-spa-query-zustand/implement-page-wishlist")
    expect(fixtures.every((fixture) => fixture.startsWith("react-spa-query-zustand/"))).toBe(true)
  })

  it("lists nothing for a case that does not exist", async () => {
    expect(await getAllReviewArtifactFixturesByCase("not-a-case")).toStrictEqual([])
  })
})

describe("getReviewArtifactFixture", () => {
  it("returns the whole content of a snapshot", async () => {
    const fixture = await getReviewArtifactFixture(STOCK_FIXTURE)

    expect(fixture.title).toBe("Modified function stockOf to subtract held stock")
    expect(fixture.context[0]).toBe("## Summary")
    expect(fixture.diff[0]).toBe("diff --git a/src/inventory/stock.ts b/src/inventory/stock.ts")
    expect(fixture.codegraph).toMatchObject({ segments: [{ title: null }] })
  })

  it("reads every fixture a case lists", async () => {
    const names = await getAllReviewArtifactFixturesByCase("react-spa-query-zustand")
    const fixtures = await Promise.all(names.map(async (name) => await getReviewArtifactFixture(name)))

    expect(fixtures).toHaveLength(names.length)
  })

  it.each(["typescript/not-a-fixture", "not-a-fixture", "../typescript/secret", "typescript/../../package"])(
    "refuses %s",
    async (name) => {
      await expect(getReviewArtifactFixture(name)).rejects.toThrow(UnknownFixtureError)
    },
  )
})
