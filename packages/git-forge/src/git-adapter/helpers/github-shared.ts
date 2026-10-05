import type { Filter, ReviewFilterOption, ReviewState } from "@/git-adapter/types"

export const REVIEW_FILTERS = [
  { key: "none", label: "No reviews", qualifier: "review:none" },
  { key: "required", label: "Review required", qualifier: "review:required" },
  { key: "approved", label: "Approved review", qualifier: "review:approved" },
  {
    key: "changes-requested",
    label: "Changes requested",
    qualifier: "review:changes_requested",
  },
  { key: "reviewed-by-me", label: "Reviewed by you", qualifier: "reviewed-by:@me" },
  {
    key: "not-reviewed-by-me",
    label: "Not reviewed by you",
    qualifier: "-reviewed-by:@me",
  },
  {
    key: "awaiting-me",
    label: "Awaiting review from you",
    qualifier: "user-review-requested:@me",
  },
  {
    key: "awaiting-me-or-team",
    label: "Awaiting review from you or your team",
    qualifier: "review-requested:@me",
  },
] as const

export type ReviewFilter = (typeof REVIEW_FILTERS)[number]["key"]

export function githubReviewFilters(): readonly ReviewFilterOption[] {
  return REVIEW_FILTERS.map((option) => ({
    key: option.key,
    label: option.label,
  }))
}

export function githubSearch(filter: Filter): string[] {
  const reviewQualifiers = REVIEW_FILTERS
    .filter((option) => filter.review.includes(option.key))
    .map((option) => option.qualifier)
  const labelQualifiers = filter.labels
    .map((label) => label.trim())
    .filter((label) => label !== "")
    .map((label) => `label:"${label}"`)
  return [...reviewQualifiers, ...labelQualifiers]
}

export function githubAvatar(login: string, size = AVATAR_SIZE): string {
  const handle = login.trim()
  return handle === ""
    ? ""
    : `https://github.com/${encodeURIComponent(handle)}.png?size=${String(size)}`
}

export const AVATAR_SIZE = 48

export function githubReviewState(raw: string): ReviewState {
  switch (raw.trim().toUpperCase()) {
    case "APPROVED":
      return "approved"
    case "CHANGES_REQUESTED":
      return "changes-requested"
    case "COMMENTED":
      return "commented"
    default:
      return "pending"
  }
}
