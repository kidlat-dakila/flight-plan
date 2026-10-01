import { EMPTY_DISCUSSION, type Discussion } from "@/procedures/get-review/utils/discussion"
import type { ReviewArtifact, Reviewer } from "@/procedures/get-review/utils/review-artifact"
import type { StoredReview } from "@/procedures/get-review/utils/review-store"
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
}

const reviewer = (name: string, state: Reviewer["state"]): Reviewer => ({ name, avatarUrl: null, state })

const STOREFRONT_REVIEWS: readonly MockPullRequestReview[] = [
  { number: 416, headCommit: "0b7d3e5", reviewers: [], artifact: null },
  { number: 414, headCommit: "5ac19f0", reviewers: [reviewer("mira", "pending")], artifact: null },
  {
    number: 412,
    headCommit: "9f2c1ab",
    reviewers: [reviewer("jonas", "approved"), reviewer("amara", "changes-requested"), reviewer("teo", "pending")],
    artifact: HELD_STOCK_ARTIFACT,
  },
  { number: 409, headCommit: "41d07ce", reviewers: [], artifact: WEBHOOK_RETRY_ARTIFACT },
  { number: 405, headCommit: "e7a94d3", reviewers: [reviewer("lena", "commented")], artifact: PRICE_ROUNDING_ARTIFACT },
  { number: 401, headCommit: "77b0c2d", reviewers: [reviewer("mira", "approved")], artifact: null },
  { number: 398, headCommit: "d41c9a8", reviewers: [], artifact: null },
  { number: 395, headCommit: "2e6f0b1", reviewers: [reviewer("lena", "commented")], artifact: null },
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

const toPullRequestReview = (review: MockPullRequestReview, now: Date): StoredReview => ({
  key: { repositoryName: STOREFRONT, targetId: `pr-${String(review.number)}` },
  discussion: review.number === HELD_STOCK_PULL_REQUEST ? heldStockDiscussion(now) : EMPTY_DISCUSSION,
  artifact: review.artifact,
  detail: {
    headCommit: review.headCommit,
    forgeUrl: `${STOREFRONT_PULL_URL}${String(review.number)}`,
    reviewers: review.reviewers,
  },
})

const toBranchReview = (name: string, headCommit: string, artifact: ReviewArtifact | null): StoredReview => ({
  key: { repositoryName: FLIGHT_PLAN, targetId: `branch-${name}` },
  artifact,
  detail: { headCommit, forgeUrl: null, reviewers: [] },
  discussion: EMPTY_DISCUSSION,
})

export const createMockReviews = (now: Date): readonly StoredReview[] => [
  ...STOREFRONT_REVIEWS.map((review) => toPullRequestReview(review, now)),
  toBranchReview("forge-capabilities", "a3c5e19", null),
  toBranchReview("refactor-to-full-web", "f80a472", WEB_REFACTOR_ARTIFACT),
  toBranchReview("codegraph-python-decorators", "6d02b47", null),
]
