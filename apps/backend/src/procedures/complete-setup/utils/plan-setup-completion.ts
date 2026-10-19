import type { SelectedAuthors } from "@/procedures/add-repository/utils/find-selected-authors"
import { planRepositoryAddition, type ListedRepository } from "@/procedures/add-repository/utils/plan-repository-addition"
import { findCompletionProblem } from "@/procedures/get-setup/utils/completion-problem"
import type { RepositoryIdentities } from "@/procedures/get-setup/utils/git-identity"
import { repositoryForgeOf, type RepositoryForges, type Setup } from "@/procedures/get-setup/utils/setup"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { FORGE_ADAPTERS } from "@/procedures/list-repositories/utils/select-forge"

export interface RepositoryListing {
  readonly repository: Repository
  readonly authors: SelectedAuthors
}

export type SetupCompletion
  = | { readonly kind: "accepted", readonly setup: Setup, readonly additions: readonly RepositoryListing[] }
    | { readonly kind: "rejected", readonly message: string }

const newListings = (
  setup: Setup,
  listedRepositories: readonly ListedRepository[],
  repositoryForges: RepositoryForges,
): RepositoryListing[] =>
  setup.repositories.flatMap(({ selfAuthor, trackedAuthors, path }) => {
    const addition = planRepositoryAddition(listedRepositories, path)
    return addition.kind === "accepted"
      ? [{
          repository: { ...addition.repository, forge: FORGE_ADAPTERS[repositoryForgeOf(repositoryForges, path)] },
          authors: { selfAuthor, trackedAuthors },
        }]
      : []
  })

export const planSetupCompletion = (
  setup: Setup,
  listedRepositories: readonly ListedRepository[],
  repositoryForges: RepositoryForges,
  repositoryIdentities: RepositoryIdentities,
): SetupCompletion => {
  const problem = findCompletionProblem(setup, repositoryForges, repositoryIdentities)
  if (problem !== null) return { kind: "rejected", message: problem }
  return {
    kind: "accepted",
    setup: { ...setup, isComplete: true },
    additions: newListings(setup, listedRepositories, repositoryForges),
  }
}
