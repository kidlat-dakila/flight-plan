import { z } from "zod"
import { WALKTHROUGH_ORDERS } from "@/procedures/get-review/utils/start/review-request"
import { AGENT_NAMES, PRESET_NAMES } from "@/procedures/get-setup/utils/setup"

export const REQUEST_FIELDS = ["customOrder", "writer", "model", "effort"] as const

export const requestReviewInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  preset: z.enum(PRESET_NAMES),
  order: z.enum(WALKTHROUGH_ORDERS),
  customOrder: z.string(),
  writer: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("agent"), agent: z.enum(AGENT_NAMES), model: z.string(), effort: z.string() }),
    z.strictObject({ kind: z.literal("manual") }),
  ]),
})

export const requestReviewResultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("requested"), prompt: z.string().nullable(), message: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), field: z.enum(REQUEST_FIELDS), message: z.string() }),
  z.strictObject({ kind: z.literal("unavailable"), message: z.string() }),
])

export type RequestReviewInput = z.infer<typeof requestReviewInputSchema>
export type RequestReviewResult = z.infer<typeof requestReviewResultSchema>
