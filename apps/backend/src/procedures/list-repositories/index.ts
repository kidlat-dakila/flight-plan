import type { ProcedureContext } from "@/procedures/context"
import { buildRepositoryIndex } from "./utils/build-repository-index"
import type { FixtureIndex, RepositoryIndex, RepositoryListRequest } from "./utils/schemas"

const readFixtures = async (input: RepositoryListRequest, context: ProcedureContext): Promise<FixtureIndex | null> => {
  if (IS_DEVELOPMENT_BUILD) {
    const { listFixtures } = await import("@/procedures/list-fixtures")
    return await listFixtures({ caseName: input.fixtureCase ?? null }, context)
  }
  return null
}

export const listRepositories = async (
  input: RepositoryListRequest,
  context: ProcedureContext,
): Promise<RepositoryIndex> => {
  const [repositories, fixtures] = await Promise.all([context.repositoryStore.list(), readFixtures(input, context)])
  return { ...buildRepositoryIndex(repositories, context.now(), context.repositoryStore.notice, input), fixtures }
}
