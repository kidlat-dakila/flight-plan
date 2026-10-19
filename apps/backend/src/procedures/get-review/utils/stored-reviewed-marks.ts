import { NO_REVIEWED_MARKS, reviewedMarksSchema, type ReviewedMarks } from "@flightplan/reviewed-marks"

const INDENT_WIDTH = 2

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const parseStoredReviewedMarks = (text: string): ReviewedMarks =>
  reviewedMarksSchema.safeParse(parseJson(text)).data ?? NO_REVIEWED_MARKS

export const formatStoredReviewedMarks = (marks: ReviewedMarks): string =>
  `${JSON.stringify(marks, null, INDENT_WIDTH)}\n`
