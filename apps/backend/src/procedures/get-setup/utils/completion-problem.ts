import type { Setup } from "./setup"

export const findRepositoriesProblem = (setup: Setup): string | null =>
  setup.repositories.length === 0 ? "Add at least one repository." : null

export const findCompletionProblem = (setup: Setup): string | null => {
  const repositoriesProblem = findRepositoriesProblem(setup)
  if (repositoriesProblem !== null) return repositoriesProblem
  if (setup.forges === null) return "Connect a git forge first."
  if (setup.agents === null) return "Choose your agents first."
  if (setup.defaultConfiguration === null) return "Choose a default prompt configuration first."
  return null
}
