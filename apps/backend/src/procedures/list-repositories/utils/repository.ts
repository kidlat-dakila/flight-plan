export type ForgeAdapterName = "git" | "gh" | "github" | "gitlab" | "glab" | "bitbucket"

export type ForgeProblem = "no-cli" | "auth" | "no-repo" | "host-mismatch" | "unsupported" | "network" | "unknown"

export interface RepositoryProblem {
  readonly kind: ForgeProblem
  readonly detail: string | null
}

export type BranchStatus
  = | "no-review"
    | "awaiting-review"
    | "awaiting-reply"
    | "stale"
    | "draft"
    | "closed"
    | "merged"

export interface PullRequestTarget {
  readonly kind: "pull-request"
  readonly number: number
  readonly title: string
  readonly branch: string
  readonly author: string
  readonly authorAvatarUrl: string | null
  readonly branchStatus: BranchStatus
  readonly isNew: boolean
  readonly updatedAt: Date
}

export interface BranchTarget {
  readonly kind: "branch"
  readonly name: string
  readonly branchStatus: BranchStatus
  readonly isNew: boolean
  readonly updatedAt: Date
}

export type ReviewTarget = PullRequestTarget | BranchTarget

export interface Repository {
  readonly name: string
  readonly path: string
  readonly forge: ForgeAdapterName
  readonly forgeSlug: string | null
  readonly problem: RepositoryProblem | null
  readonly hasFollowedAuthors: boolean
  readonly targets: readonly ReviewTarget[]
}
