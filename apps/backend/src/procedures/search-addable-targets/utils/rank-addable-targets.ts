import type { Fzf as FzfClass } from "fzf"
import type { ReviewTarget } from "@/procedures/list-repositories/utils/repository"

const DEFAULT_TARGET_COUNT = 5
const MATCHED_TARGET_LIMIT = 10

interface FzfModule {
  readonly Fzf: typeof FzfClass
}

const loadFzf = async (): Promise<FzfModule> => await import("fzf")

const searchTextOf = (target: ReviewTarget): string =>
  target.kind === "pull-request" ? `${target.branch} ${target.title} #${String(target.number)}` : target.name

export const rankAddableTargets = async (
  targets: readonly ReviewTarget[],
  query: string,
): Promise<readonly ReviewTarget[]> => {
  const trimmedQuery = query.trim()
  if (trimmedQuery === "") return targets.slice(0, DEFAULT_TARGET_COUNT)
  const { Fzf } = await loadFzf()
  return new Fzf(targets, { selector: searchTextOf, casing: "case-insensitive", limit: MATCHED_TARGET_LIMIT })
    .find(trimmedQuery)
    .map((match) => match.item)
}
