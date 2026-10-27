import type { ProcedureContext } from "@/procedures/context"
import { carryWriting } from "@/procedures/get-review/utils/carry-writing"
import type { ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { reviewPreferencesOf } from "@/procedures/get-review-preferences/utils/review-preferences"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { buildArtifactAt } from "@/procedures/request-review/utils/build-artifact"
import type { ReviewArtifact } from "@flightplan/configurations"

export const resegmentedArtifactOf = (previous: ReviewArtifact, rebuilt: ReviewArtifact): ReviewArtifact =>
  ({ ...carryWriting(previous, rebuilt, "written"), status: previous.status })

export const scaffoldSegmentedAs = async (
  scaffold: ReviewScaffold,
  isSegmented: boolean,
  repository: Repository,
  context: ProcedureContext,
): Promise<ReviewScaffold> => {
  if (scaffold.artifact.isSegmented === isSegmented) return scaffold
  const setup = await context.setupStore.read()
  const opened = await context.openRepository(repository.path, setup.forges, repository.baseBranch)
  const building = await buildArtifactAt(opened.resolved, {
    baseCommit: scaffold.baseCommit,
    headCommit: scaffold.artifact.commit,
    title: scaffold.artifact.title,
    newId: context.conversationEnvironment.newId,
    ignoredPaths: reviewPreferencesOf(setup.reviewPreferences).ignoredPaths,
    isSegmented,
  })
  return building.kind === "unavailable" ? scaffold : { ...scaffold, artifact: resegmentedArtifactOf(scaffold.artifact, building.artifact) }
}
