import type { ProcedureContext } from "@/procedures/context"
import { notRepositoryMessage, planRepositoryAddition, type RepositoryAddition } from "./utils/plan-repository-addition"
import { resolveRepositoryAuthors } from "./utils/resolve-repository-authors"
import type { AddRepositoryInput } from "./utils/schemas"

export const addRepository = async (
  input: AddRepositoryInput,
  context: ProcedureContext,
): Promise<RepositoryAddition> => {
  const [setup, listedRepositories] = await Promise.all([context.setupStore.read(), context.repositoryStore.listRegistered()])
  const addition = planRepositoryAddition(listedRepositories, input.path)
  if (addition.kind === "rejected") return addition
  const { repository } = addition
  if (!(await context.setupEnvironment.isRepositoryFolder(repository.path))) {
    return { kind: "rejected", message: notRepositoryMessage(repository.path) }
  }
  const finding = await resolveRepositoryAuthors(context, setup, repository, input)
  if (finding.kind === "rejected") return finding
  await context.repositoryStore.add(repository, finding.authors)
  return addition
}
