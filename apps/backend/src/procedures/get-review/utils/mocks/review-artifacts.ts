import { EMPTY_DISCUSSION, type Discussion } from "@/procedures/get-review/utils/discussion"
import type { StoredReview } from "@/procedures/get-review/utils/review-store"
import type { Reviewer } from "@/procedures/get-review/utils/review-target-detail"
import type { ReviewArtifact } from "@flightplan/configurations"
import { HELD_STOCK_ARTIFACT } from "./held-stock"
import { PRICE_ROUNDING_ARTIFACT } from "./price-rounding-artifact"
import { WEB_REFACTOR_ARTIFACT } from "./web-refactor-artifact"
import { WEBHOOK_RETRY_ARTIFACT } from "./webhook-retry-artifact"

const STOREFRONT = "storefront"
const FLIGHT_PLAN = "flight-plan"
const STOREFRONT_PULL_URL = "https://github.com/acme/storefront/pull/"

interface MockPullRequestReview {
  readonly number: number
  readonly headCommit: string
  readonly reviewers: readonly Reviewer[]
  readonly artifact: ReviewArtifact | null
  readonly unreviewedPaths: readonly string[]
}

const NO_PATHS: readonly string[] = []

const DELIVERY_ESTIMATE_PATHS = [
  "src/delivery/estimate.ts",
  "src/delivery/carrier-rates.ts",
  "src/delivery/__tests__/estimate.spec.ts",
  "src/checkout/DeliveryStep.tsx",
  "src/checkout/DeliveryStep.module.css",
  "src/checkout/__tests__/delivery-step.spec.tsx",
  "src/api/routes/delivery.ts",
  "migrations/0042_delivery_zones.sql",
  "config/carriers.json",
  "docs/delivery.md",
]

const CART_BADGE_PATHS = [
  "src/cart/CartBadge.tsx",
  "src/cart/cart-count.ts",
  "src/cart/__tests__/cart-count.spec.ts",
  "src/layout/Header.tsx",
]

const STOCK_QUERY_PATHS = ["src/inventory/stock-level.ts", "migrations/0041_stock_index.sql", "scripts/benchmark-stock.sh"]

const FORGE_CAPABILITIES_PATHS = [
  "apps/backend/src/utils/git-adapter/types.ts",
  "apps/backend/src/utils/git-adapter/github-adapter.ts",
  "apps/backend/src/utils/git-adapter/gitlab-adapter.ts",
  "apps/backend/src/utils/git-adapter/__tests__/github-adapter.spec.ts",
  "packages/ui/src/components/ReviewActions/index.tsx",
  "docs/vocabulary/forge.md",
]

const PYTHON_DECORATOR_PATHS = [
  "codegraph/python/decorators.py",
  "codegraph/python/resolve_calls.py",
  "codegraph/python/tests/test_decorators.py",
  "codegraph/pyproject.toml",
]

const reviewer = (name: string, state: Reviewer["state"]): Reviewer => ({ name, avatarUrl: null, state })

const STOREFRONT_REVIEWS: readonly MockPullRequestReview[] = [
  { number: 416, headCommit: "0b7d3e5", reviewers: [], artifact: null, unreviewedPaths: DELIVERY_ESTIMATE_PATHS },
  { number: 414, headCommit: "5ac19f0", reviewers: [reviewer("mira", "pending")], artifact: null, unreviewedPaths: CART_BADGE_PATHS },
  {
    number: 412,
    headCommit: "9f2c1ab",
    reviewers: [reviewer("jonas", "approved"), reviewer("amara", "changes-requested"), reviewer("teo", "pending")],
    artifact: HELD_STOCK_ARTIFACT,
    unreviewedPaths: NO_PATHS,
  },
  { number: 409, headCommit: "41d07ce", reviewers: [], artifact: WEBHOOK_RETRY_ARTIFACT, unreviewedPaths: NO_PATHS },
  { number: 405, headCommit: "e7a94d3", reviewers: [reviewer("lena", "commented")], artifact: PRICE_ROUNDING_ARTIFACT, unreviewedPaths: NO_PATHS },
  { number: 401, headCommit: "77b0c2d", reviewers: [reviewer("mira", "approved")], artifact: null, unreviewedPaths: CART_BADGE_PATHS },
  { number: 398, headCommit: "d41c9a8", reviewers: [], artifact: null, unreviewedPaths: DELIVERY_ESTIMATE_PATHS },
  { number: 395, headCommit: "2e6f0b1", reviewers: [reviewer("lena", "commented")], artifact: null, unreviewedPaths: STOCK_QUERY_PATHS },
]

const MS_PER_MINUTE = 60_000
const HELD_STOCK_PULL_REQUEST = 412

const minutesBefore = (now: Date, { minutes }: { readonly minutes: number }): Date =>
  new Date(now.getTime() - minutes * MS_PER_MINUTE)

const heldStockDiscussion = (now: Date): Discussion => ({
  threads: [
    {
      id: "thread-1",
      path: "src/inventory/stock-level.ts",
      line: 13,
      comments: [
        {
          id: "comment-1",
          author: "amara",
          body: "Can `heldByOthers` be larger than `stock.onHand`? Then this returns a negative number.",
          createdAt: minutesBefore(now, { minutes: 170 }),
          isPending: false,
        },
        {
          id: "comment-2",
          author: "mira",
          body: "It can, when two carts hold the last unit. I will clamp it at zero.",
          createdAt: minutesBefore(now, { minutes: 95 }),
          isPending: false,
        },
      ],
    },
    {
      id: "thread-2",
      path: "src/inventory/holds.ts",
      line: 15,
      comments: [
        {
          id: "comment-3",
          author: "jonas",
          body: "Does the database index cover `expiresAfter`? This runs on every stock check.",
          createdAt: minutesBefore(now, { minutes: 220 }),
          isPending: false,
        },
      ],
    },
    {
      id: "thread-3",
      path: null,
      line: null,
      comments: [
        {
          id: "comment-4",
          author: "teo",
          body: "I will look at this after the release on Thursday.",
          createdAt: minutesBefore(now, { minutes: 300 }),
          isPending: false,
        },
      ],
    },
  ],
  reviews: [
    {
      id: "review-1",
      author: "jonas",
      verdict: "approve",
      body: "The direction is right. One question on the query, inline.",
      createdAt: minutesBefore(now, { minutes: 215 }),
    },
    {
      id: "review-2",
      author: "amara",
      verdict: "request-changes",
      body: "The stock level can go negative. See my comment on `availableUnits`.",
      createdAt: minutesBefore(now, { minutes: 165 }),
    },
  ],
})

const changedPathsOf = (artifact: ReviewArtifact | null, unreviewedPaths: readonly string[]): readonly string[] =>
  artifact === null ? unreviewedPaths : artifact.segments.flatMap((segment) => segment.changedPaths)

const toPullRequestReview = (review: MockPullRequestReview, now: Date): StoredReview => ({
  key: { repositoryName: STOREFRONT, targetId: `pr-${String(review.number)}` },
  discussion: review.number === HELD_STOCK_PULL_REQUEST ? heldStockDiscussion(now) : EMPTY_DISCUSSION,
  artifact: review.artifact,
  detail: {
    headCommit: review.headCommit,
    forgeUrl: `${STOREFRONT_PULL_URL}${String(review.number)}`,
    reviewers: review.reviewers,
    changedPaths: changedPathsOf(review.artifact, review.unreviewedPaths),
  },
})

const toBranchReview = (
  name: string,
  headCommit: string,
  artifact: ReviewArtifact | null,
  unreviewedPaths: readonly string[],
): StoredReview => ({
  key: { repositoryName: FLIGHT_PLAN, targetId: `branch-${name}` },
  artifact,
  detail: { headCommit, forgeUrl: null, reviewers: [], changedPaths: changedPathsOf(artifact, unreviewedPaths) },
  discussion: EMPTY_DISCUSSION,
})

export const createMockReviews = (now: Date): readonly StoredReview[] => [
  ...STOREFRONT_REVIEWS.map((review) => toPullRequestReview(review, now)),
  toBranchReview("forge-capabilities", "a3c5e19", null, FORGE_CAPABILITIES_PATHS),
  toBranchReview("refactor-to-full-web", "f80a472", WEB_REFACTOR_ARTIFACT, NO_PATHS),
  toBranchReview("codegraph-python-decorators", "6d02b47", null, PYTHON_DECORATOR_PATHS),
]
