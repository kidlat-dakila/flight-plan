import { planRepositoryAddition, type ListedRepository } from "@/procedures/add-repository/utils/plan-repository-addition"
import { findCompletionProblem } from "@/procedures/get-setup/utils/completion-problem"
import { authorForgeOf, type Setup, type SetupForge } from "@/procedures/get-setup/utils/setup"
import type { ForgeAdapterName, Repository } from "@/procedures/list-repositories/utils/repository"

export type SetupCompletion
  = | { readonly kind: "accepted", readonly setup: Setup, readonly repositories: readonly Repository[] }
    | { readonly kind: "rejected", readonly message: string }

const FORGE_ADAPTERS: Record<SetupForge, ForgeAdapterName> = {
  git: "git",
  gh: "gh",
  glab: "gitlab",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
}

const newRepositories = (setup: Setup, listedRepositories: readonly ListedRepository[]): Repository[] =>
  setup.repositories.flatMap((repository) => {
    const addition = planRepositoryAddition(listedRepositories, repository.path)
    return addition.kind === "accepted"
      ? [{ ...addition.repository, forge: FORGE_ADAPTERS[authorForgeOf(setup)] }]
      : []
  })

export const planSetupCompletion = (setup: Setup, listedRepositories: readonly ListedRepository[]): SetupCompletion => {
  const problem = findCompletionProblem(setup)
  if (problem !== null) return { kind: "rejected", message: problem }
  return {
    kind: "accepted",
    setup: { ...setup, isComplete: true },
    repositories: newRepositories(setup, listedRepositories),
  }
}
