export type ReviewerState = "pending" | "commented" | "approved" | "changes-requested"

export interface Reviewer {
  readonly login: string | null
  readonly name: string
  readonly avatarUrl: string | null
  readonly state: ReviewerState
}

export interface ReviewTargetDetail {
  readonly headCommit: string
  readonly forgeUrl: string | null
  readonly reviewers: readonly Reviewer[]
  readonly changedPaths: readonly string[]
}
