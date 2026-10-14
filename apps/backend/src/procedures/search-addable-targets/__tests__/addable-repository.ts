import type { RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { createChangeRepositoryOpener, type ChangeRepository } from "@/procedures/request-review/__tests__/change-repository"
import type { RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import type { BranchTip, ReviewTarget as ForgeTarget } from "@flightplan/git-forge"

const STOREFRONT_CHANGE: RecordedChange = {
  repositoryPath: "/Users/dev/projects/storefront",
  branchName: "spike/returns",
  revision: { headCommit: "1111111", baseCommit: "0000000" },
  diff: "",
  changedPaths: [],
  texts: {},
}

const tip = (name: string, updatedAt: string): BranchTip => ({ name, sha: `sha-${name}`, authorEmail: "x@acme.dev", updatedAt })

export const STOREFRONT_BRANCH_TIPS: readonly BranchTip[] = [
  tip("spike/returns", "2026-10-01T11:00:00.000Z"),
  tip("feature/gift-card-balance", "2026-10-01T11:57:00.000Z"),
  tip("fix/currency-rounding", "2026-10-01T10:00:00.000Z"),
  tip("chore/upgrade-node", "2026-10-01T09:00:00.000Z"),
  tip("feature/wishlist-share", "2026-10-01T08:00:00.000Z"),
  tip("feature/loyalty-points", "2026-10-01T07:00:00.000Z"),
]

export const STOREFRONT_OPEN_PULL_REQUESTS: readonly ForgeTarget[] = [
  {
    ref: { kind: "pr", number: 416 },
    title: "Show the gift card balance at checkout",
    author: "lena",
    url: "",
    updatedAt: "2026-10-01T11:57:00.000Z",
    isDraft: false,
    headBranch: "feature/gift-card-balance",
    reason: "review-requested",
  },
  {
    ref: { kind: "pr", number: 420 },
    title: "Round prices in the shopper's currency",
    author: "stranger",
    url: "",
    updatedAt: "2026-10-01T10:30:00.000Z",
    isDraft: false,
    headBranch: "fix/currency-rounding",
    reason: "review-requested",
  },
]

export const createAddableRepositoryOpener = (overrides: Partial<ChangeRepository> = {}): RepositoryAdapterOpener =>
  createChangeRepositoryOpener([
    {
      change: STOREFRONT_CHANGE,
      baseTexts: {},
      listBranches: async () => await Promise.resolve([...STOREFRONT_BRANCH_TIPS]),
      listTargets: async () => await Promise.resolve([...STOREFRONT_OPEN_PULL_REQUESTS]),
      ...overrides,
    },
  ])
