import type { FixtureCatalog } from "@/procedures/list-fixtures/utils/fixture-catalog"
import { getAllFixtureCases, getFixtureRepository, getReviewArtifactFixture } from "@flightplan/playground-fixtures"

const FIXTURE_NAME_SEPARATOR = "/"

export const createFixtureFileCatalog = (testCasesPath: string): FixtureCatalog => ({
  listCaseNames: async () => await getAllFixtureCases(testCasesPath),
  readRepository: async (caseName) => await getFixtureRepository(testCasesPath, caseName),
  readArtifact: async (caseName, snapshotName) =>
    await getReviewArtifactFixture(testCasesPath, [caseName, snapshotName].join(FIXTURE_NAME_SEPARATOR)),
})
