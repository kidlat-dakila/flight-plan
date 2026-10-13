import { z } from "zod"
import { MOVE_DIRECTIONS } from "@/procedures/edit-segments/utils/schemas"

export const walkthroughEditSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("move-file"), path: z.string(), direction: z.enum(MOVE_DIRECTIONS) }),
  z.strictObject({ kind: z.literal("remove-file"), path: z.string() }),
  z.strictObject({
    kind: z.literal("change-waypoint"),
    waypointId: z.string(),
    title: z.string(),
    reading: z.string(),
    needsAttention: z.string().nullable(),
  }),
  z.strictObject({ kind: z.literal("remove-waypoint"), waypointId: z.string() }),
])

export const editWalkthroughInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  segmentId: z.string(),
  edit: walkthroughEditSchema,
})

export const walkthroughEditingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("saved") }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type WalkthroughEdit = z.infer<typeof walkthroughEditSchema>
export type EditWalkthroughInput = z.infer<typeof editWalkthroughInputSchema>
export type WalkthroughEditing = z.infer<typeof walkthroughEditingSchema>
