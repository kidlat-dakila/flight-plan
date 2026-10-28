import type { ProcedureContext } from "@/procedures/context"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import type { TargetSuggestions } from "@/procedures/search-creation-targets/utils/schemas"
import { buildAddableSuggestions } from "./utils/build-addable-suggestions"
import { rankAddableTargets } from "./utils/rank-addable-targets"
import { readAddableTargets } from "./utils/read-addable-targets"
import type { SearchAddableTargetsInput } from "./utils/schemas"

export const searchAddableTargets = async (
  input: SearchAddableTargetsInput,
  context: ProcedureContext,
): Promise<TargetSuggestions | null> => {
  const [repositories, setup] = await Promise.all([context.repositoryStore.list(), context.setupStore.read()])
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  if (repository === undefined) return null
  const reading = await readAddableTargets(repository, setup.forges, context.openRepository)
  if (reading.kind === "unreadable") return { options: [], message: reading.message }
  const ranked = await rankAddableTargets(reading.targets, input.query)
  return buildAddableSuggestions(ranked, repository.targets.map(targetIdOf), input.query, context.now())
}
