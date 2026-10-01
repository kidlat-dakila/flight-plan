import type { ProcedureContext } from "@/procedures/context"
import { buildRepositoryIndex } from "./utils/build-repository-index"
import type { RepositoryIndex, RepositoryListRequest } from "./utils/schemas"

export const listRepositories = async (
  input: RepositoryListRequest,
  context: ProcedureContext,
): Promise<RepositoryIndex> =>
  buildRepositoryIndex(await context.repositoryStore.list(), context.now(), context.dataNotice, input)
