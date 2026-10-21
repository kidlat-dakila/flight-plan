import type { UpdateCheck } from "./schemas"

export const CHECK_INTERVAL_MS = 86_400_000

export const isCheckDue = (check: UpdateCheck | null, now: Date): boolean => {
  if (check === null) return true
  const elapsedMs = now.getTime() - new Date(check.checkedAt).getTime()
  return elapsedMs < 0 || elapsedMs >= CHECK_INTERVAL_MS
}
