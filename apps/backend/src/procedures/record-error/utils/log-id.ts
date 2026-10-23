const LOG_ID_PATTERN = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-([\da-f]{6})$/
const SUFFIX_LENGTH = 6
const ISO_DATE_END = 10
const ISO_TIME_START = 11
const ISO_TIME_END = 19
const MONTH_OFFSET = 1

const compact = (text: string): string => text.replaceAll(/[-:]/g, "")

export const isLogId = (text: string): boolean => LOG_ID_PATTERN.test(text)

export const logIdOf = (recordedAt: Date, suffix: string): string => {
  const isoText = recordedAt.toISOString()
  return `${compact(isoText.slice(0, ISO_DATE_END))}-${compact(isoText.slice(ISO_TIME_START, ISO_TIME_END))}-${suffix.slice(0, SUFFIX_LENGTH)}`
}

export const recordedAtOf = (logId: string): Date | null => {
  const match = LOG_ID_PATTERN.exec(logId)
  if (match === null) return null
  const [, year, month, day, hours, minutes, seconds] = match.map(Number)
  return new Date(Date.UTC(year, month - MONTH_OFFSET, day, hours, minutes, seconds))
}
