import type { PullRequestTarget } from "@/procedures/list-repositories/utils/repository"
import type { ForgeOutcome } from "./pull-request-forge"
import type { ReviewSubject } from "./review-subject"

export type PullRequestSubject = ReviewSubject & { readonly target: PullRequestTarget }

export type ReviewActionResult
  = | { readonly kind: "done" }
    | { readonly kind: "refused", readonly message: string }

export const ACTION_DONE: ReviewActionResult = { kind: "done" }

export const refuseAction = (message: string): ReviewActionResult => ({ kind: "refused", message })

export const isPullRequestSubject = (subject: ReviewSubject): subject is PullRequestSubject =>
  subject.target.kind === "pull-request"

export const toActionResult = (outcome: ForgeOutcome): ReviewActionResult =>
  outcome.kind === "done" ? ACTION_DONE : refuseAction(outcome.reason)
