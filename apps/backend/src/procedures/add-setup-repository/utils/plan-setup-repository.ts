import { planRepositoryAddition, type ListedRepository } from "@/procedures/add-repository/utils/plan-repository-addition"
import type { Setup, SetupRepository } from "@/procedures/get-setup/utils/setup"

export type SetupRepositoryPlan
  = | { readonly kind: "accepted", readonly repository: SetupRepository }
    | { readonly kind: "rejected", readonly message: string }

export const planSetupRepository = (
  setup: Setup,
  listedRepositories: readonly ListedRepository[],
  enteredPath: string,
): SetupRepositoryPlan => {
  const addition = planRepositoryAddition([...listedRepositories, ...setup.repositories], enteredPath)
  if (addition.kind === "rejected") return addition
  return {
    kind: "accepted",
    repository: {
      name: addition.repository.name,
      path: addition.repository.path,
      selfAuthor: null,
      trackedAuthors: [],
    },
  }
}

export const withRepository = (setup: Setup, repository: SetupRepository): Setup => ({
  ...setup,
  repositories: [...setup.repositories, repository],
})
