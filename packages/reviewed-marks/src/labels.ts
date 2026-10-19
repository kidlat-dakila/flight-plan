export const REVIEWED_LABEL = "Reviewed"

export const EVERY_FILE_REVIEWED_MESSAGE = "Every file is reviewed. Show the reviewed files to read them again."

export interface ReviewedToggle {
  readonly label: string
  readonly countLabel: string
  readonly isShown: boolean
  readonly isAvailable: boolean
}

const countLabelOf = (count: number, singular: string, plural: string): string =>
  `${String(count)} ${count === 1 ? singular : plural}`

export const reviewedToggleOf = (reviewedCount: number, isShown: boolean): ReviewedToggle => ({
  label: REVIEWED_LABEL,
  countLabel: countLabelOf(reviewedCount, "waypoint", "waypoints"),
  isShown,
  isAvailable: reviewedCount > 0,
})

export const positionLabelOf = (position: number, count: number): string =>
  `${String(position + 1)} of ${String(count)}`

export const markLabelOf = (kindLabel: string, positionLabel: string, title: string): string =>
  kindLabel === ""
    ? `Waypoint ${positionLabel}: ${title}`
    : `${kindLabel} waypoint ${positionLabel}: ${title}`
