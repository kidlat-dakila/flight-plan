import type { ProcedureContext } from "@/procedures/context"
import { reviewPreferencesOf } from "@/procedures/get-review-preferences/utils/review-preferences"
import { requiredContextKindsOf } from "@/procedures/read-artifact/utils/context-code-blocks"
import { buildArtifact } from "@/procedures/request-review/utils/build-artifact"
import { withConfiguration } from "@/procedures/request-review/utils/starting-artifact"
import type { ReviewArtifact } from "@flightplan/configurations"
import { targetTitleOf } from "./build-shell"
import { carryWriting } from "./carry-writing"
import { branchNameOf } from "./change-reader"
import type { ReviewKey } from "./review-store"
import type { ReviewSubject } from "./review-subject"

const DRAFTING_STATUS = "drafting"

export const isRefreshable = (subject: ReviewSubject): boolean =>
  subject.isStored
  && subject.artifact !== null
  && subject.artifact.status !== DRAFTING_STATUS
  && subject.detail !== null
  && subject.detail.headCommit !== subject.artifact.commit

export const refreshedArtifactOf = (previous: ReviewArtifact, rebuilt: ReviewArtifact): ReviewArtifact => {
  const configured = withConfiguration({ ...rebuilt, isSegmented: previous.isSegmented }, { requiredContextKinds: requiredContextKindsOf(previous) })
  return { ...carryWriting(previous, configured, "written"), status: previous.status }
}

export const refreshArtifact = async (subject: ReviewSubject, key: ReviewKey, context: ProcedureContext): Promise<ReviewArtifact | null> => {
  if (!isRefreshable(subject)) return subject.artifact
  const scaffold = await context.reviewStore.readScaffold(key)
  if (scaffold === null) return subject.artifact
  const branchName = branchNameOf(subject.target)
  const pull = await context.pullBranch(subject.repository.path, branchName)
  if (pull.kind === "failed") return subject.artifact
  const setup = await context.setupStore.read()
  const opened = await context.openRepository(subject.repository.path, setup.forges, subject.repository.baseBranch)
  const building = await buildArtifact(opened.resolved, {
    branchName,
    title: targetTitleOf(subject.target),
    newId: context.conversationEnvironment.newId,
    ignoredPaths: reviewPreferencesOf(setup.reviewPreferences).ignoredPaths,
    isSegmented: scaffold.artifact.isSegmented,
  })
  if (building.kind === "unavailable" || building.artifact.commit === scaffold.artifact.commit) return subject.artifact
  const artifact = refreshedArtifactOf(scaffold.artifact, building.artifact)
  await context.reviewStore.writeScaffold(key, { ...scaffold, artifact, baseCommit: building.baseCommit })
  return artifact
}
