import { z } from "zod"
import { WALKTHROUGH_ORDERS, WRITE_UP_SECTIONS } from "@/procedures/get-review-preferences/utils/review-preferences"

export const writeUpReviewInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  sections: z.array(z.enum(WRITE_UP_SECTIONS)),
  configurationId: z.string(),
  walkthroughOrder: z.enum(WALKTHROUGH_ORDERS),
  isSegmented: z.boolean(),
})

export const WRITE_UP_FIELDS = ["sections", "configuration", "agent"] as const

export const writeUpResultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("started"), prompt: z.string().nullable(), message: z.string() }),
  z.strictObject({ kind: z.literal("written"), message: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), field: z.enum(WRITE_UP_FIELDS), message: z.string() }),
])

export type WriteUpReviewInput = z.infer<typeof writeUpReviewInputSchema>
export type WriteUpResult = z.infer<typeof writeUpResultSchema>
