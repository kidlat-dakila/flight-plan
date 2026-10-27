import type { BranchStatus, Repository, ReviewTarget } from "./repository"

const MS_PER_MINUTE = 60_000

interface MockPullRequest {
  readonly number: number
  readonly title: string
  readonly branch: string
  readonly author: string
  readonly branchStatus: BranchStatus
  readonly isNew: boolean
  readonly updatedMinutesAgo: number
}

interface MockBranch {
  readonly name: string
  readonly branchStatus: BranchStatus
  readonly isNew: boolean
  readonly updatedMinutesAgo: number
}

const STOREFRONT_PULL_REQUESTS: readonly MockPullRequest[] = [
  {
    number: 416,
    title: "Show the gift card balance at checkout",
    branch: "feature/gift-card-balance",
    author: "lena",
    branchStatus: "no-review",
    isNew: true,
    updatedMinutesAgo: 3,
  },
  {
    number: 414,
    title: "Sketch a returns flow for damaged items",
    branch: "spike/returns-flow",
    author: "teo",
    branchStatus: "draft",
    isNew: false,
    updatedMinutesAgo: 22,
  },
  {
    number: 412,
    title: "Count held units in the stock check",
    branch: "feature/held-stock",
    author: "mira",
    branchStatus: "stale",
    isNew: false,
    updatedMinutesAgo: 38,
  },
  {
    number: 409,
    title: "Retry failed payment webhooks with backoff",
    branch: "fix/webhook-retry",
    author: "jonas",
    branchStatus: "awaiting-review",
    isNew: false,
    updatedMinutesAgo: 4,
  },
  {
    number: 405,
    title: "Move price rounding into the cart total",
    branch: "refactor/price-rounding",
    author: "amara",
    branchStatus: "awaiting-reply",
    isNew: false,
    updatedMinutesAgo: 190,
  },
  {
    number: 401,
    title: "Add the currency to the price type",
    branch: "feature/price-currency",
    author: "amara",
    branchStatus: "merged",
    isNew: false,
    updatedMinutesAgo: 1500,
  },
  {
    number: 398,
    title: "Show delivery estimates on the checkout page",
    branch: "feature/delivery-estimate",
    author: "teo",
    branchStatus: "no-review",
    isNew: false,
    updatedMinutesAgo: 2900,
  },
  {
    number: 395,
    title: "Try a faster query for the stock level",
    branch: "spike/stock-query",
    author: "jonas",
    branchStatus: "closed",
    isNew: false,
    updatedMinutesAgo: 5800,
  },
]

const FLIGHT_PLAN_BRANCHES: readonly MockBranch[] = [
  { name: "forge-capabilities", branchStatus: "no-review", isNew: true, updatedMinutesAgo: 12 },
  { name: "refactor-to-full-web", branchStatus: "no-review", isNew: false, updatedMinutesAgo: 75 },
  { name: "codegraph-python-decorators", branchStatus: "no-review", isNew: false, updatedMinutesAgo: 4300 },
]

const minutesBefore = (now: Date, minutes: number): Date => new Date(now.getTime() - minutes * MS_PER_MINUTE)

const toPullRequestTarget = (pullRequest: MockPullRequest, now: Date): ReviewTarget => ({
  kind: "pull-request",
  number: pullRequest.number,
  title: pullRequest.title,
  branch: pullRequest.branch,
  author: pullRequest.author,
  authorAvatarUrl: null,
  branchStatus: pullRequest.branchStatus,
  isNew: pullRequest.isNew,
  updatedAt: minutesBefore(now, pullRequest.updatedMinutesAgo),
})

const toBranchTarget = (branch: MockBranch, now: Date): ReviewTarget => ({
  kind: "branch",
  name: branch.name,
  branchStatus: branch.branchStatus,
  isNew: branch.isNew,
  updatedAt: minutesBefore(now, branch.updatedMinutesAgo),
})

export const createMockRepositories = (now: Date): readonly Repository[] => [
  {
    name: "storefront",
    path: "/Users/dev/projects/storefront",
    baseBranch: null,
    forge: "gh",
    forgeSlug: "acme/storefront",
    problem: null,
    targets: STOREFRONT_PULL_REQUESTS.map((pullRequest) => toPullRequestTarget(pullRequest, now)),
  },
  {
    name: "flight-plan",
    path: "/Users/dev/projects/flight-plan",
    baseBranch: null,
    forge: "git",
    forgeSlug: null,
    problem: null,
    targets: FLIGHT_PLAN_BRANCHES.map((branch) => toBranchTarget(branch, now)),
  },
  {
    name: "ledger-api",
    path: "/Users/dev/projects/ledger-api",
    baseBranch: null,
    forge: "gitlab",
    forgeSlug: "acme/ledger-api",
    problem: { kind: "auth", detail: "GitLab answered 401 to GET /api/v4/user: 401 Unauthorized" },
    targets: [],
  },
  {
    name: "docs-site",
    path: "/Users/dev/projects/docs-site",
    baseBranch: null,
    forge: "github",
    forgeSlug: "acme/docs-site",
    problem: null,
    targets: [],
  },
]
