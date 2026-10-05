import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

const TARGET_ID_PATTERN = /^(?:pr-[1-9]\d*|branch-.+)$/

export interface RegisteredRepository {
  readonly name: string
  readonly path: string
}

export type ReviewTargetLookup
  = | { readonly kind: "found", readonly workingPath: string }
    | { readonly kind: "rejected", readonly message: string }

const unknownRepositoryMessage = (repositoryName: string, repositories: readonly RegisteredRepository[]): string => {
  const missing = `Flight Plan has no repository named "${repositoryName}".`
  return repositories.length === 0
    ? `${missing} It follows no repositories yet.`
    : `${missing} It follows: ${repositories.map(({ name }) => name).join(", ")}.`
}

export const isTargetId = (targetId: string): boolean => TARGET_ID_PATTERN.test(targetId)

export const lookUpReviewTarget = (key: ReviewKey, repositories: readonly RegisteredRepository[]): ReviewTargetLookup => {
  if (!isTargetId(key.targetId)) {
    return {
      kind: "rejected",
      message: `"${key.targetId}" is not a review target. Use pr-<number> for a pull request or branch-<name> for a branch.`,
    }
  }
  const repository = repositories.find(({ name }) => name === key.repositoryName)
  return repository === undefined
    ? { kind: "rejected", message: unknownRepositoryMessage(key.repositoryName, repositories) }
    : { kind: "found", workingPath: repository.path }
}
