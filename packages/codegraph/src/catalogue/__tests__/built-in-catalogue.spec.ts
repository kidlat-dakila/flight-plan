import { listFixtureProblems } from "@/catalogue/fixture-problems"
import { BUILT_IN_FIXTURES } from "@/catalogue/fixtures"
import { BUILT_IN_LIBRARIES } from "@/catalogue/libraries"
import { listCatalogueProblems } from "@/catalogue/library-problems"

describe("the built-in catalogue", () => {
  it("has no library with a problem", () => {
    expect(listCatalogueProblems(BUILT_IN_LIBRARIES)).toStrictEqual([])
  })

  it("has a fixture with code to match and code to reject for every pattern", () => {
    expect(listFixtureProblems(BUILT_IN_LIBRARIES, BUILT_IN_FIXTURES)).toStrictEqual([])
  })
})
