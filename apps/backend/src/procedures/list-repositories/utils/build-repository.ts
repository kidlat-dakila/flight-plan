import type { SetupRepository } from "@/procedures/get-setup/utils/setup"
import { toBranchTargets, toPullRequestTargets } from "./build-review-targets"
import type { ForgeSnapshot } from "./forge-pull-request"
import type { LocalBranch } from "./local-branch"
import type {
  BranchTarget,
  ForgeAdapterName,
  ForgeProblem,
  PullRequestTarget,
  Repository,
  ReviewTarget,
} from "./repository"
import type { TargetMemory } from "./target-memory"

export interface RepositoryInspection {
  readonly forge: ForgeAdapterName
  readonly forgeSlug: string | null
  readonly problem: ForgeProblem | null
  readonly snapshot: ForgeSnapshot | null
  readonly branches: readonly LocalBranch[]
}

const withoutPullRequestBranches = (
  branches: readonly BranchTarget[],
  pullRequests: readonly PullRequestTarget[],
): readonly BranchTarget[] =>
  branches.filter((branch) => !pullRequests.some((pullRequest) => pullRequest.branch === branch.name))

const targetsOf = (
  registered: SetupRepository,
  inspection: RepositoryInspection,
  memory: TargetMemory,
): readonly ReviewTarget[] => {
  if (inspection.problem !== null) return []
  const branches = toBranchTargets(inspection.branches, memory)
  if (inspection.snapshot === null) return branches
  const pullRequests = toPullRequestTargets(inspection.snapshot, registered.trackedAuthors.map((author) => author.id), memory)
  return [...pullRequests, ...withoutPullRequestBranches(branches, pullRequests)]
}

export const buildRepository = (
  registered: SetupRepository,
  inspection: RepositoryInspection,
  memory: TargetMemory,
): Repository => ({
  name: registered.name,
  path: registered.path,
  forge: inspection.forge,
  forgeSlug: inspection.forgeSlug,
  problem: inspection.problem,
  hasFollowedAuthors: registered.trackedAuthors.length > 0 || registered.selfAuthor !== null,
  targets: targetsOf(registered, inspection, memory),
})
