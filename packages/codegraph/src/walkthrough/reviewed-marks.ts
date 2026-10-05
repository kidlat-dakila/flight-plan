export interface ReviewedMarks {
  readonly waypoints: Readonly<Record<string, string>>
  readonly files: Readonly<Record<string, string>>
}

export const NO_REVIEWED_MARKS: ReviewedMarks = { waypoints: {}, files: {} }
