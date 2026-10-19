import { z } from "zod"

export const reviewedSubjectSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("waypoint"), id: z.string() }),
  z.strictObject({ kind: z.literal("file"), path: z.string() }),
  z.strictObject({ kind: z.literal("root-block"), id: z.string() }),
])

export type ReviewedSubject = z.infer<typeof reviewedSubjectSchema>
