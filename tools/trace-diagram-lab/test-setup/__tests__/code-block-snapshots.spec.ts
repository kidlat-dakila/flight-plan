import { join } from "node:path"
import { getAllFixtureCases, getAllReviewArtifactFixturesByCase } from "@flightplan/playground-fixtures"
import { codeBlocksPathOf, listFixtureNames, storedCodeBlocksOf } from "@flightplan/playground-fixtures/test-setup"

const CASES_PATH = join(import.meta.dirname, "..", "..", "cases")

const FIXTURE_NAMES = await listFixtureNames(CASES_PATH, getAllFixtureCases, getAllReviewArtifactFixturesByCase)

describe("the stored form of the code block groups of every lab case", () => {
  it.each(FIXTURE_NAMES)("builds the groups of %s as its committed snapshot holds them", async (fixtureName) => {
    await expect(await storedCodeBlocksOf(CASES_PATH, fixtureName)).toMatchFileSnapshot(codeBlocksPathOf(CASES_PATH, fixtureName))
  })
})
