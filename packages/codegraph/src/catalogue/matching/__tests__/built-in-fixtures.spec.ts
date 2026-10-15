import { BUILT_IN_FIXTURES } from "@/catalogue/fixtures"
import { BUILT_IN_LIBRARIES } from "@/catalogue/libraries"
import { listFixtureFailures } from "@/catalogue/matching/fixture-failures"

const WHOLE_CATALOGUE_TIMEOUT_MS = 30_000

describe("the fixtures of the built-in catalogue", () => {
  it("match the code they must and none of the code they must not", () => {
    expect(listFixtureFailures(BUILT_IN_LIBRARIES, BUILT_IN_FIXTURES).join("\n")).toBe("")
  }, WHOLE_CATALOGUE_TIMEOUT_MS)
})
