import type { ProcedureContext } from "@/procedures/context"
import { buildRepositoryIndex } from "./utils/build-repository-index"
import { isFinishedFlightPlan, newTargetIdsOf, withoutFinishedPrompts } from "./utils/finished-targets"
import type { Repository } from "./utils/repository"
import { unlistedBranchNamesOf, withReviewedBranches, type ReviewedBranch } from "./utils/reviewed-branches"
import type { FixtureIndex, RepositoryIndex, RepositoryListRequest } from "./utils/schemas"
import { branchTargetIdOf } from "./utils/target-id"

const readFixtures = async (input: RepositoryListRequest, context: ProcedureContext): Promise<FixtureIndex | null> => {
  if (IS_DEVELOPMENT_BUILD) {
    const { listFixtures } = await import("@/procedures/list-fixtures")
    return await listFixtures({ caseName: input.fixtureCase ?? null }, context)
  }
  return null
}

const findReviewedBranch = async (
  repository: Repository,
  branchName: string,
  context: ProcedureContext,
): Promise<ReviewedBranch | null> => {
  const key = { repositoryName: repository.name, targetId: branchTargetIdOf(branchName) }
  const [revision, request] = await Promise.all([
    context.changeReader.findRevision(repository.path, branchName),
    context.reviewStore.findRequest(key),
  ])
  return revision === null ? null : { name: branchName, requestedAt: request?.requestedAt ?? context.now() }
}

export const addReviewedBranches = async (repository: Repository, context: ProcedureContext): Promise<Repository> => {
  if (repository.problem !== null) return repository
  const branchNames = unlistedBranchNamesOf(repository, await context.reviewStore.listTargetIds(repository.name))
  const found = await Promise.all(branchNames.map(async (branchName) => await findReviewedBranch(repository, branchName, context)))
  return withReviewedBranches(repository, found.filter((branch) => branch !== null))
}

const isFinishedTarget = async (repositoryName: string, targetId: string, context: ProcedureContext): Promise<boolean> => {
  const key = { repositoryName, targetId }
  const [artifact, publications] = await Promise.all([context.reviewStore.findArtifact(key), context.reviewStore.readPublications(key)])
  return isFinishedFlightPlan(artifact, publications)
}

const dropFinishedPrompts = async (repository: Repository, context: ProcedureContext): Promise<Repository> => {
  const finishedTargetIds = await Promise.all(
    newTargetIdsOf(repository).map(async (targetId) => ((await isFinishedTarget(repository.name, targetId, context)) ? [targetId] : [])),
  )
  return withoutFinishedPrompts(repository, finishedTargetIds.flat())
}

const prepareRepository = async (repository: Repository, context: ProcedureContext): Promise<Repository> =>
  await addReviewedBranches(await dropFinishedPrompts(repository, context), context)

export const listRepositories = async (
  input: RepositoryListRequest,
  context: ProcedureContext,
): Promise<RepositoryIndex> => {
  const [listed, fixtures] = await Promise.all([context.repositoryStore.list(), readFixtures(input, context)])
  const repositories = await Promise.all(listed.map(async (repository) => await prepareRepository(repository, context)))
  return { ...buildRepositoryIndex(repositories, context.now(), context.repositoryStore.notice, input), fixtures }
}
