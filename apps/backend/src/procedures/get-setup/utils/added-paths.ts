import type { Setup } from "./setup"

interface ListedPath {
  readonly path: string
}

export interface AddedPaths {
  readonly inSetup: readonly string[]
  readonly inFlightPlan: readonly string[]
}

const SETUP_LABEL = "Added"
const FLIGHT_PLAN_LABEL = "Already in Flight Plan"

export const NO_ADDED_PATHS: AddedPaths = { inSetup: [], inFlightPlan: [] }

export const addedRepositoryPaths = (setup: Setup, listedRepositories: readonly ListedPath[]): AddedPaths => ({
  inSetup: setup.repositories.map((repository) => repository.path),
  inFlightPlan: listedRepositories.map((repository) => repository.path),
})

export const addedLabelOf = (path: string, addedPaths: AddedPaths): string | null => {
  if (addedPaths.inSetup.includes(path)) return SETUP_LABEL
  return addedPaths.inFlightPlan.includes(path) ? FLIGHT_PLAN_LABEL : null
}
