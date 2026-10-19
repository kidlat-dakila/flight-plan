import { z } from "zod"

export const reviewableWaypointSchema = z.strictObject({
  id: z.string(),
  fingerprint: z.string(),
  depth: z.number().int(),
  rootBlockIds: z.array(z.string()),
})

export const reviewableRootBlockSchema = z.strictObject({
  id: z.string(),
  fingerprint: z.string(),
})

export const reviewableFileSchema = z.strictObject({
  path: z.string(),
  fingerprint: z.string(),
  waypoints: z.array(reviewableWaypointSchema),
  rootBlocks: z.array(reviewableRootBlockSchema),
})

export type ReviewableWaypoint = z.infer<typeof reviewableWaypointSchema>
export type ReviewableRootBlock = z.infer<typeof reviewableRootBlockSchema>
export type ReviewableFile = z.infer<typeof reviewableFileSchema>
