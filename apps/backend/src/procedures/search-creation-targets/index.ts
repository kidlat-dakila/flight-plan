import type { ProcedureContext } from "@/procedures/context"
import type { ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { hasStoredReview } from "@/procedures/migrate-review/utils/stored-version-state"
import { buildTargetSuggestions, type OfferedTarget } from "./utils/build-target-suggestions"
import { readBranchTips } from "./utils/read-branch-tips"
import type { SearchCreationTargetsInput, TargetSuggestions } from "./utils/schemas"
import { selectCreationTargets } from "./utils/select-creation-targets"

export const offerTarget = async (
  repositoryName: string,
  target: ReviewTarget,
  context: Pick<ProcedureContext, "reviewStore">,
): Promise<OfferedTarget> => ({ target, hasFlightPlan: await hasStoredReview({ repositoryName, targetId: targetIdOf(target) }, context) })

export const searchCreationTargets = async (
  input: SearchCreationTargetsInput,
  context: ProcedureContext,
): Promise<TargetSuggestions | null> => {
  const [repositories, setup] = await Promise.all([context.repositoryStore.list(), context.setupStore.read()])
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  if (repository === undefined) return null
  const [viewerLogin, branchTips] = await Promise.all([
    context.repositoryStore.readViewerLogin(repository.name),
    readBranchTips(repository.path, setup.forges, context.openRepository),
  ])
  const targets = selectCreationTargets({
    targets: repository.targets,
    branchTips,
    viewerLogin,
    query: input.query,
  })
  const offered = await Promise.all(targets.map(async (target) => await offerTarget(repository.name, target, context)))
  return buildTargetSuggestions(offered, input.query, context.now())
}
