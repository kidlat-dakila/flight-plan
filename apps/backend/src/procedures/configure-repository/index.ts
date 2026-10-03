import { missingRepositoryMessage } from "@/procedures/add-repository/utils/plan-repository-addition"
import { resolveRepositoryAuthors } from "@/procedures/add-repository/utils/resolve-repository-authors"
import type { ProcedureContext } from "@/procedures/context"
import type { ConfigureRepositoryInput, RepositoryConfiguring } from "./utils/schemas"

export const configureRepository = async (
  input: ConfigureRepositoryInput,
  context: ProcedureContext,
): Promise<RepositoryConfiguring> => {
  const [setup, listedRepositories] = await Promise.all([context.setupStore.read(), context.repositoryStore.listRegistered()])
  const repository = listedRepositories.find((listed) => listed.name === input.repositoryName)
  if (repository === undefined) return { kind: "rejected", message: missingRepositoryMessage(input.repositoryName) }
  const finding = await resolveRepositoryAuthors(context, setup, repository, input)
  if (finding.kind === "rejected") return finding
  const isReplaced = await context.repositoryStore.replaceAuthors(repository.name, finding.authors)
  return isReplaced ? { kind: "accepted" } : { kind: "rejected", message: missingRepositoryMessage(repository.name) }
}
