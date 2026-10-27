import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import type { PullRequestTarget, Repository } from "@/procedures/list-repositories/utils/repository"

export const pullRequest: PullRequestTarget = {
  kind: "pull-request",
  number: 416,
  title: "Estimate the delivery date",
  branch: "feature/delivery-estimate",
  author: "teo",
  authorAvatarUrl: null,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: new Date("2026-10-01T12:00:00.000Z"),
}

export const storefront: Repository = {
  name: "storefront",
  path: "/work/storefront",
  baseBranch: null,
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  targets: [pullRequest],
}

export const createRequest = (overrides: Partial<ReviewRequest> = {}): ReviewRequest => ({
  configurationId: "standard",
  preset: "standard",
  order: "foundations-first",
  customOrder: null,
  writer: { kind: "none" },
  requestedAt: new Date("2026-10-01T12:00:00.000Z"),
  ...overrides,
})
