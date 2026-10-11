import { buildBranchReviewArtifact, type BranchReviewArtifact } from "@flightplan/codegraph"
import { GitAdapterError, type Resolved } from "@flightplan/git-forge"

export type ArtifactBuilding
  = | ({ readonly kind: "built" } & BranchReviewArtifact)
    | { readonly kind: "unavailable", readonly message: string }

export interface ArtifactChange {
  readonly branchName: string
  readonly title: string
  readonly newId: () => string
}

const NO_CHANGE_MESSAGE = "This change touches no files, so there is nothing to review."

const unavailable = (message: string): ArtifactBuilding => ({ kind: "unavailable", message })

export const buildArtifact = async (opened: Resolved, { branchName, title, newId }: ArtifactChange): Promise<ArtifactBuilding> => {
  if (!opened.ok) return unavailable(opened.error.message)
  try {
    const built = await buildBranchReviewArtifact({
      gitAdapter: opened.gitAdapter,
      ref: { kind: "branch", name: branchName },
      title,
      newId,
    })
    return built.artifact.changedPaths.length === 0 ? unavailable(NO_CHANGE_MESSAGE) : { kind: "built", ...built }
  } catch (error) {
    if (error instanceof GitAdapterError) return unavailable(error.message)
    throw error
  }
}
