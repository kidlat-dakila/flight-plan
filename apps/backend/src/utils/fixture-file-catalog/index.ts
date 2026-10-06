import type { FixtureCatalog } from "@/procedures/list-fixtures/utils/fixture-catalog"
import { getAllFixtureCases, getFixtureRepository } from "@flightplan/playground-fixtures"

export const createFixtureFileCatalog = (testCasesPath: string): FixtureCatalog => ({
  listCaseNames: async () => await getAllFixtureCases(testCasesPath),
  readRepository: async (caseName) => await getFixtureRepository(testCasesPath, caseName),
})
