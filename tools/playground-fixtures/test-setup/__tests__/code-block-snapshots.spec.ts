import { join } from "node:path"
import { getAllFixtureCases, getAllReviewArtifactFixturesByCase } from "@/index"
import { codeBlocksPathOf, storedCodeBlocksOf } from "@test-setup/code-block-snapshot"
import { listFixtureNames } from "@test-setup/fixture-change"

const TEST_CASES_PATH = join(import.meta.dirname, "..", "..", "test-cases")

const FIXTURE_NAMES = await listFixtureNames(TEST_CASES_PATH, getAllFixtureCases, getAllReviewArtifactFixturesByCase)

describe("the stored form of the code block groups of every case", () => {
  it.each(FIXTURE_NAMES)("builds the groups of %s as its committed snapshot holds them", async (fixtureName) => {
    await expect(await storedCodeBlocksOf(TEST_CASES_PATH, fixtureName)).toMatchFileSnapshot(codeBlocksPathOf(TEST_CASES_PATH, fixtureName))
  })
})
