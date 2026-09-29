/**
 * Arranging the review rows, with no VS Code in sight.
 *
 * Split out of the tree for the same reason the plans view splits its own: the
 * one decision with logic in it — which author comes first — can then be read
 * and tested without an extension host.
 */

/** What a group needs of a row. The tree holds the rest. */
export type AuthorRow = {
  author: string
  /** Why the row is in the list. `mine` is what makes a group yours. */
  reason: string
}

export type AuthorGroup<T> = {
  author: string
  /** Whether these are the reader's own changes. */
  mine: boolean
  rows: T[]
}

/** The label for the reader's own group, rather than their own username. */
export const YOU = "You"

/**
 * Groups rows by author, keeping the order the rows arrived in.
 *
 * A `Map` for exactly that: the first row of each author decides where that
 * author sits, so whatever ordering the list already has — a change awaiting
 * your review outranks one of your own — survives the grouping instead of
 * being replaced by an alphabet.
 *
 * The reader's own group goes last. It is the one group they cannot review, and
 * the list exists to show what is waiting for them.
 */
export function groupByAuthor<T extends AuthorRow>(
  rows: readonly T[],
): AuthorGroup<T>[] {
  const byAuthor = new Map<string, AuthorGroup<T>>()

  for (const row of rows) {
    const existing = byAuthor.get(row.author)
    if (existing === undefined) {
      byAuthor.set(row.author, {
        author: row.author,
        mine: row.reason === "mine",
        rows: [row],
      })
      continue
    }
    existing.rows.push(row)
    // One row of your own is enough to make the group yours: the same author
    // can appear as both, when a change of yours also requests your review.
    if (row.reason === "mine") existing.mine = true
  }

  const groups = [...byAuthor.values()]
  return [...groups.filter((group) => !group.mine), ...groups.filter((group) => group.mine)]
}

/** What the dim text needs of a row. The tree holds the rest. */
export type DescribableRow = {
  author: string
  reason: string
  isDraft: boolean
  /** Whether a walkthrough exists, as the tree tracks it. */
  walkthrough: string
}

/**
 * The dim text after a row's title.
 *
 * Joined from the parts that apply rather than concatenated with separators
 * built in, because grouping drops one of them: the author is the group's own
 * label, and a row that lost it used to render `draft ·  · no walkthrough`.
 */
export function describeRow(row: DescribableRow, grouped: boolean): string {
  const parts: string[] = []
  if (row.isDraft) parts.push("draft")
  // Grouped, the author is the parent's label. Repeating it in every row spends
  // the description on the one thing already on screen.
  if (!grouped) parts.push(row.reason === "mine" ? "yours" : row.author)
  switch (row.walkthrough) {
    case "absent":
      parts.push("no walkthrough")
      break
    case "error":
      parts.push("could not check")
      break
    default:
      break
  }
  return parts.join(" · ")
}
