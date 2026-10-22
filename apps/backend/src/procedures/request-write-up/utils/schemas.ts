import { z } from "zod"

export const writeUpTargetSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("waypoint"), waypointId: z.string() }),
  z.strictObject({ kind: z.literal("root-block"), rootBlockId: z.string() }),
  z.strictObject({ kind: z.literal("trace-node"), segmentId: z.string(), nodeId: z.string() }),
  z.strictObject({ kind: z.literal("blast-file"), segmentId: z.string(), path: z.string() }),
])

export const requestWriteUpInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  target: writeUpTargetSchema,
})

export const WRITE_UP_REQUEST_FIELDS = ["target", "agent"] as const

export const writeUpRequestResultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("started"), prompt: z.string().nullable(), message: z.string() }),
  z.strictObject({ kind: z.literal("written"), message: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), field: z.enum(WRITE_UP_REQUEST_FIELDS), message: z.string() }),
])

export type WriteUpTarget = z.infer<typeof writeUpTargetSchema>
export type RequestWriteUpInput = z.infer<typeof requestWriteUpInputSchema>
export type WriteUpRequestResult = z.infer<typeof writeUpRequestResultSchema>
