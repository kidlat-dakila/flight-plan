import { listFixtureProblems } from "@/catalogue/fixture-problems"
import { BUILT_IN_FIXTURES } from "@/catalogue/fixtures"
import { listCatalogueProblems } from "@/catalogue/library-problems"
import { listFixtureFailures } from "@/catalogue/matching/fixture-failures"
import { PYTHON_LIBRARIES } from "@/code-blocks/languages/python/libraries"
import { PYTHON_LIBRARY_FIXTURES } from "@/code-blocks/languages/python/libraries/__tests__/fixtures"
import { TYPESCRIPT_LIBRARIES } from "@/code-blocks/languages/typescript/libraries"
import { TYPESCRIPT_LIBRARY_FIXTURES } from "@/code-blocks/languages/typescript/libraries/__tests__/fixtures"
import { LIBRARIES } from "@/code-blocks/libraries"

const LIBRARY_FILE_FIXTURES = [...TYPESCRIPT_LIBRARY_FIXTURES, ...PYTHON_LIBRARY_FIXTURES]
const LIBRARY_FILES = [...TYPESCRIPT_LIBRARIES, ...PYTHON_LIBRARIES]
const LIBRARY_FILES_TIMEOUT_MS = 30_000

describe("the libraries of every language", () => {
  it("have no library with a problem, the catalogue's and the library files' together", () => {
    expect(listCatalogueProblems(LIBRARIES)).toStrictEqual([])
  })

  it("have a fixture with code to match and code to reject for every pattern of a library file", () => {
    expect(listFixtureProblems(LIBRARIES, [...BUILT_IN_FIXTURES, ...LIBRARY_FILE_FIXTURES])).toStrictEqual([])
  })

  it("match the code their fixtures must and none of the code they must not", () => {
    expect(listFixtureFailures(LIBRARY_FILES, LIBRARY_FILE_FIXTURES).join("\n")).toBe("")
  }, LIBRARY_FILES_TIMEOUT_MS)
})
