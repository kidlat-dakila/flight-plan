import { z } from "zod"

export const MAX_QUOTE_LENGTH = 5_000

export const artifactPartSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("review") }),
  z.strictObject({ kind: z.literal("segment"), segmentId: z.string() }),
  z.strictObject({ kind: z.literal("waypoint"), waypointId: z.string() }),
  z.strictObject({ kind: z.literal("trace-diagram"), segmentId: z.string() }),
  z.strictObject({ kind: z.literal("trace-node"), segmentId: z.string(), nodeId: z.string() }),
  z.strictObject({ kind: z.literal("blast-node"), segmentId: z.string(), path: z.string() }),
  z.strictObject({ kind: z.literal("context-code-block"), blockId: z.string() }),
])

export const buildTextReferenceInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  part: artifactPartSchema,
  quote: z.string().trim().min(1).max(MAX_QUOTE_LENGTH),
})

export const textReferenceSchema = z.strictObject({ reference: z.string() })

export type ArtifactPart = z.infer<typeof artifactPartSchema>
export type BuildTextReferenceInput = z.infer<typeof buildTextReferenceInputSchema>
export type TextReference = z.infer<typeof textReferenceSchema>
