import { recordedAtOf } from "./log-id"

export const KEPT_LOG_DAYS = 30
export const KEPT_LOG_COUNT = 500

const DAY_MS = 86_400_000

const newestFirst = (ids: readonly string[]): readonly string[] => [...ids].sort((left, right) => right.localeCompare(left))

const isOlderThan = (id: string, cutoff: number): boolean => (recordedAtOf(id)?.getTime() ?? Number.NEGATIVE_INFINITY) < cutoff

export const planLogPruning = (ids: readonly string[], now: Date): readonly string[] => {
  const cutoff = now.getTime() - KEPT_LOG_DAYS * DAY_MS
  return newestFirst(ids).filter((id, position) => position >= KEPT_LOG_COUNT || isOlderThan(id, cutoff))
}

export const latestIds = (ids: readonly string[], count: number): readonly string[] => newestFirst(ids).slice(0, count)
