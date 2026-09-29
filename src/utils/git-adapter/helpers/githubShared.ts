import type { Filter, ReviewFilterOption, ReviewState } from "../../../lib/git-adapter/types"

/**
 * The parts of GitHub that both GitHub adapters share.
 *
 * Two of them reach the same service by different roads — the CLI and the REST
 * API — and the search vocabulary, the filter list and the diff anchor are
 * properties of GitHub rather than of either road. Keeping them here is what
 * stops the token adapter quietly offering a different set of filters from the
 * CLI one, which a reader would experience as the filters changing when they
 * switched how they sign in.
 */

/**
 * The review states GitHub can be asked about, and how to ask.
 *
 * Its own vocabulary, not one invented here: these are the eight the pull
 * request search offers, under the names its own interface gives them. Four
 * are about the review as a whole and four are about you, which is why they
 * are one list rather than two — a reader picking "changes requested" and
 * "awaiting review from you" is asking one question.
 *
 * The order is the order they are offered in and the order they compose in, so
 * one filter is always one search string however it was clicked together.
 */
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

/** GitHub's own review filters, offered under the names its interface uses. */
export function githubReviewFilters(): readonly ReviewFilterOption[] {
  return REVIEW_FILTERS.map((option) => ({
    key: option.key,
    label: option.label,
  }))
}

/**
 * The qualifiers a filter becomes.
 *
 * Everything combines with AND, which is GitHub's own rule and worth knowing at
 * the picker: two review states that contradict each other return nothing,
 * exactly as they would on the website.
 *
 * Labels are quoted because GitHub splits an unquoted qualifier at the first
 * space, and a label with a space in it is ordinary.
 */
export function githubSearch(filter: Filter): string[] {
  const parts: string[] = []
  for (const option of REVIEW_FILTERS) {
    if (filter.review.includes(option.key)) parts.push(option.qualifier)
  }
  for (const label of filter.labels) {
    const trimmed = label.trim()
    if (trimmed !== "") parts.push(`label:"${trimmed}"`)
  }
  return parts
}

/**
 * A GitHub avatar, from a handle alone.
 *
 * `gh pr view` returns logins and no pictures, so the CLI adapter has nothing to
 * pass on unless the URL can be derived. `github.com/<login>.png` is GitHub's
 * own documented redirect to the current avatar, so it stays correct when
 * somebody changes their picture and needs no extra request to discover.
 *
 * Sized down at the source. The header draws these at 24px and the full-size
 * original is often several hundred kilobytes, which matters because the
 * extension fetches every one of them and inlines it as a `data:` URI.
 */
export function githubAvatar(login: string, size = AVATAR_SIZE): string {
  const handle = login.trim()
  return handle === ""
    ? ""
    : `https://github.com/${encodeURIComponent(handle)}.png?size=${String(size)}`
}

/** What the header draws an avatar at, doubled for a high-density display. */
export const AVATAR_SIZE = 48

/**
 * GitHub's review states, in this extension's vocabulary.
 *
 * `DISMISSED` maps to `pending` rather than to a state of its own: a dismissed
 * review has been explicitly set aside and its author is expected to look
 * again, which is what `pending` means here. `PENDING` is GitHub's name for a
 * draft review nobody has submitted, which is the same situation from the other
 * direction.
 *
 * An unrecognised state is `pending` too. A new one would otherwise have to be
 * guessed at, and "still expected to look" is the only reading that cannot
 * claim something false about a person.
 */
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
