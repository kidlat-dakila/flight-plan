import type { BranchTarget, PullRequestTarget } from "@/procedures/list-repositories/utils/repository"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { toTargetOption } from "@/procedures/search-creation-targets/utils/build-target-suggestions"
import type { CompleteAction } from "./schemas"

const COMPLETE_LABEL = "Mark as complete"

const PULL_REQUEST_CHOICE_LABELS = {
  title: "Choose the pull request",
  description: "This Flight Plan is made for a branch. Choose your open pull request it belongs to, and it moves there.",
  confirmLabel: COMPLETE_LABEL,
  skipLabel: "Complete without a pull request",
  cancelLabel: "Cancel",
}

const NO_PULL_REQUESTS_MESSAGE = "You have no open pull request without a Flight Plan."

export interface BranchLinking {
  readonly branch: BranchTarget
  readonly pullRequests: readonly PullRequestTarget[]
}

const pullRequestIdOfBranch = ({ branch, pullRequests }: BranchLinking): string | null => {
  const ofBranch = pullRequests.find((pullRequest) => pullRequest.branch === branch.name)
  return ofBranch === undefined ? null : targetIdOf(ofBranch)
}

export const buildCompleteAction = (linking: BranchLinking | null, now: Date): CompleteAction => ({
  label: COMPLETE_LABEL,
  pullRequestChoice: linking === null
    ? null
    : {
        ...PULL_REQUEST_CHOICE_LABELS,
        emptyMessage: linking.pullRequests.length === 0 ? NO_PULL_REQUESTS_MESSAGE : null,
        options: linking.pullRequests.map((target) => toTargetOption({ target, hasFlightPlan: false }, now)),
        selectedId: pullRequestIdOfBranch(linking),
      },
})
