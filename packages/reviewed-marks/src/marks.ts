import { z } from "zod"

export interface ReviewedMarks {
  readonly waypoints: Readonly<Record<string, string>>
  readonly files: Readonly<Record<string, string>>
  readonly rootBlocks: Readonly<Record<string, string>>
}

const fingerprintByIdSchema = z.record(z.string(), z.string())

export const reviewedMarksSchema = z.strictObject({
  waypoints: fingerprintByIdSchema,
  files: fingerprintByIdSchema,
  rootBlocks: fingerprintByIdSchema,
})

export const NO_REVIEWED_MARKS: ReviewedMarks = { waypoints: {}, files: {}, rootBlocks: {} }

export const parseReviewedMarks = (value: unknown): ReviewedMarks =>
  reviewedMarksSchema.safeParse(value).data ?? NO_REVIEWED_MARKS
