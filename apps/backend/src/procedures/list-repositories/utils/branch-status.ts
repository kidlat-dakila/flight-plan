import type { BranchStatus } from "./repository"

export const BRANCH_STATUSES = [
  "no-review",
  "awaiting-review",
  "awaiting-reply",
  "stale",
  "draft",
  "closed",
  "merged",
] as const

export const STATUS_LABELS: Record<BranchStatus, string> = {
  "no-review": "No review",
  "awaiting-review": "Awaiting review",
  "awaiting-reply": "Awaiting reply",
  "stale": "Stale",
  "draft": "Draft",
  "closed": "Closed",
  "merged": "Merged",
}
