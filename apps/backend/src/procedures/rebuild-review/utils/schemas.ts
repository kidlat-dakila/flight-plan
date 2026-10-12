import { z } from "zod"
import { REQUEST_FIELDS, requestReviewInputSchema } from "@/procedures/request-review/utils/schemas"

export const REBUILD_MODES = ["update", "regenerate"] as const

export const rebuildReviewInputSchema = requestReviewInputSchema.extend({ mode: z.enum(REBUILD_MODES) })

export const rebuildReviewResultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("rebuilt"), prompt: z.string().nullable(), message: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), field: z.enum(REQUEST_FIELDS), message: z.string() }),
  z.strictObject({ kind: z.literal("unavailable"), message: z.string() }),
])

export type RebuildMode = (typeof REBUILD_MODES)[number]
export type RebuildReviewInput = z.infer<typeof rebuildReviewInputSchema>
export type RebuildReviewResult = z.infer<typeof rebuildReviewResultSchema>
