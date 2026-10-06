import type { ProcedureContext } from "@/procedures/context"
import type { FixtureIndex } from "@/procedures/list-repositories/utils/schemas"
import { buildFixtureIndex, chooseCaseName } from "./utils/build-fixture-index"

export interface FixtureListRequest {
  readonly caseName: string | null
}

export const listFixtures = async (input: FixtureListRequest, context: ProcedureContext): Promise<FixtureIndex | null> => {
  const catalog = context.fixtureCatalog
  if (catalog === undefined) return null
  const caseNames = await catalog.listCaseNames()
  const caseName = chooseCaseName(caseNames, input.caseName)
  return caseName === null ? null : buildFixtureIndex(caseNames, await catalog.readRepository(caseName), context.now())
}
