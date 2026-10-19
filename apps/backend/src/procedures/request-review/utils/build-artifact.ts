import { buildBranchReviewArtifact, buildCommitReviewArtifact, type BranchReviewArtifact } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"
import { GitAdapterError, type GitAdapter, type Resolved } from "@flightplan/git-forge"

export type ArtifactBuilding
  = | ({ readonly kind: "built" } & BranchReviewArtifact)
    | { readonly kind: "unavailable", readonly message: string }

export interface ArtifactChange {
  readonly branchName: string
  readonly title: string
  readonly newId: () => string
  readonly ignoredPaths: readonly string[]
  readonly isSegmented: boolean
}

export interface CommitChange {
  readonly baseCommit: string
  readonly headCommit: string
  readonly title: string
  readonly newId: () => string
  readonly ignoredPaths: readonly string[]
  readonly isSegmented: boolean
}

const NO_CHANGE_MESSAGE = "This change touches no files, so there is nothing to review."

const unavailable = (message: string): ArtifactBuilding => ({ kind: "unavailable", message })

const buildWith = async (opened: Resolved, build: (gitAdapter: GitAdapter) => Promise<BranchReviewArtifact>): Promise<ArtifactBuilding> => {
  if (!opened.ok) return unavailable(opened.error.message)
  try {
    const built = await build(opened.gitAdapter)
    return built.artifact.changedPaths.length === 0 ? unavailable(NO_CHANGE_MESSAGE) : { kind: "built", ...built }
  } catch (error) {
    if (error instanceof GitAdapterError) return unavailable(error.message)
    throw error
  }
}

export const buildArtifact = async (opened: Resolved, { branchName, ...choices }: ArtifactChange): Promise<ArtifactBuilding> =>
  await buildWith(opened, async (gitAdapter) =>
    await buildBranchReviewArtifact({ gitAdapter, ref: { kind: "branch", name: branchName }, ...choices }))

const atCommits = (artifact: ReviewArtifact, baseCommit: string): BranchReviewArtifact => ({ artifact, baseCommit })

export const buildArtifactAt = async (opened: Resolved, change: CommitChange): Promise<ArtifactBuilding> =>
  await buildWith(opened, async (gitAdapter) =>
    atCommits(await buildCommitReviewArtifact({ gitAdapter, ...change }), change.baseCommit))
