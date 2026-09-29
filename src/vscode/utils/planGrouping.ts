/**
 * Arranging the plan rows, with no VS Code in sight.
 *
 * Split out of the tree so the two decisions with real logic in them — which
 * rows to show, and what order the branches come in — can be tested without an
 * extension host.
 */

import { storedDocument } from "../../lib/schemas/document/stored"

export type PlanRow = {
  name: string
  title: string
  /** The branch the plan was written against, or null when none was recorded. */
  branch: string | null
  archived: boolean
}

export type PlanGroup = { branch: string | null; rows: PlanRow[] }

/** What a plan written against no recorded branch is filed under. */
export const NO_BRANCH = "No branch recorded"

/** The rows a given toggle state shows. */
export function visiblePlans(
  rows: readonly PlanRow[],
  showArchived: boolean,
): PlanRow[] {
  return showArchived ? [...rows] : rows.filter((row) => !row.archived)
}

/**
 * Groups rows by branch, keeping the order the rows arrived in.
 *
 * A `Map` for exactly that: the first plan of each branch decides where the
 * branch sits, so the branch you last wrote a plan on stays at the top. Plans
 * with no recorded branch go last, because they are the ones with the least to
 * say about where they belong.
 */
export function groupPlansByBranch(rows: readonly PlanRow[]): PlanGroup[] {
  const byBranch = new Map<string | null, PlanRow[]>()
  for (const row of rows) {
    const existing = byBranch.get(row.branch)
    if (existing === undefined) byBranch.set(row.branch, [row])
    else existing.push(row)
  }

  const groups = [...byBranch].map(([branch, rows]) => ({ branch, rows }))
  return [
    ...groups.filter((entry) => entry.branch !== null),
    ...groups.filter((entry) => entry.branch === null),
  ]
}

/**
 * A stored plan's title and branch, read off its JSON.
 *
 * Null when the file is not a valid plan, and the row then falls back to the
 * plan's name. The tree lists what is on disk, and one unreadable file should
 * cost its own title, not the whole view.
 */
export function planSummaryOf(text: string): { title: string; branch: string | null } | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  const parsed = storedDocument.safeParse(raw)
  if (!parsed.success || parsed.data.meta.kind !== "plan") return null
  return { title: parsed.data.title, branch: parsed.data.meta.branch ?? null }
}
