const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000

const TIME_STEPS = [
  { unit: "day", ms: MS_PER_DAY },
  { unit: "hour", ms: MS_PER_HOUR },
  { unit: "minute", ms: MS_PER_MINUTE },
] as const

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "always" })

export const formatRelativeTime = (then: Date, now: Date): string => {
  const elapsedMs = now.getTime() - then.getTime()
  const step = TIME_STEPS.find(({ ms }) => elapsedMs >= ms)
  return step ? relativeTimeFormat.format(-Math.floor(elapsedMs / step.ms), step.unit) : "just now"
}
