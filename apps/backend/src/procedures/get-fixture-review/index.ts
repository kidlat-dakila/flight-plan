import type { ProcedureContext } from "@/procedures/context"
import type { ReviewSubject } from "@/procedures/get-review/utils/review-subject"
import { snapshotNameOf } from "@/procedures/list-fixtures/utils/build-fixture-index"
import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"

export interface FixtureReviewRequest {
  readonly caseName: string
  readonly snapshotName: string
}

const FIXTURE_NOTICE = "A playground fixture. This repository and this change are not real."

export const getFixtureReview = async (
  { caseName, snapshotName }: FixtureReviewRequest,
  context: ProcedureContext,
): Promise<ReviewSubject | null> => {
  const catalog = context.fixtureCatalog
  if (catalog === undefined) return null
  const caseNames = await catalog.listCaseNames()
  if (!caseNames.includes(caseName)) return null
  const repository = await catalog.readRepository(caseName)
  const target = repository.targets.find((candidate) => snapshotNameOf(candidate) === snapshotName)
  if (target === undefined) return null
  const artifact = await catalog.readArtifact(caseName, snapshotName)
  return {
    repository,
    lineColor: lineColorAt(caseNames.indexOf(caseName)),
    target,
    artifact,
    detail: { headCommit: artifact.commit, forgeUrl: null, reviewers: [], changedPaths: artifact.changedPaths },
    notice: FIXTURE_NOTICE,
  }
}
