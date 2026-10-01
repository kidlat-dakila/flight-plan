import type { ReviewTarget } from "./repository"

export const targetIdOf = (target: ReviewTarget): string =>
  target.kind === "pull-request" ? `pr-${String(target.number)}` : `branch-${target.name}`
