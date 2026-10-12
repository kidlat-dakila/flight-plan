import { z } from "zod"

export const MOVE_DIRECTIONS = ["up", "down"] as const

const segmentContentShape = {
  title: z.string(),
  paths: z.array(z.string()),
}

export const segmentEditSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("add"), ...segmentContentShape }),
  z.strictObject({ kind: z.literal("change"), segmentId: z.string(), ...segmentContentShape }),
  z.strictObject({ kind: z.literal("move"), segmentId: z.string(), direction: z.enum(MOVE_DIRECTIONS) }),
  z.strictObject({ kind: z.literal("remove"), segmentId: z.string() }),
])

export const editSegmentsInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  edit: segmentEditSchema,
})

export const segmentsEditingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("saved") }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type MoveDirection = (typeof MOVE_DIRECTIONS)[number]
export type SegmentEdit = z.infer<typeof segmentEditSchema>
export type EditSegmentsInput = z.infer<typeof editSegmentsInputSchema>
export type SegmentsEditing = z.infer<typeof segmentsEditingSchema>
