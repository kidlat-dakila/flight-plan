import type { PullRequestSearchItem } from "@agntn/forges"
import type { ReviewTarget } from "@/utils/git-adapter/types"

export function mergeTargets(
  searchGroups: readonly ReviewTarget[][],
  pinned: readonly ReviewTarget[],
): ReviewTarget[] {
  const weakestFirst = [...searchGroups].reverse().flat()
  const entries: [number, ReviewTarget][] = [...weakestFirst, ...pinned].flatMap((row) =>
    row.ref.kind === "pr" ? [[row.ref.number, row]] : [],
  )
  const byNumber = new Map<number, ReviewTarget>(entries)
  return [...byNumber.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

export function pullRequestItemToTarget(
  item: PullRequestSearchItem,
  reason: ReviewTarget["reason"],
): ReviewTarget {
  return {
    ref: { kind: "pr", number: item.number },
    title: item.title,
    author: item.author.login,
    url: item.url,
    updatedAt: item.updatedAt,
    isDraft: item.draft,
    reason,
  }
}
