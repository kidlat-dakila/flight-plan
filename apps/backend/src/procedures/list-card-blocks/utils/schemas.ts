import { z } from "zod"

export const listCardBlocksInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  segmentId: z.string(),
  path: z.string(),
})

export const cardBlockOptionSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  detail: z.string(),
  lineStart: z.number().int(),
  lineEnd: z.number().int(),
  heldLabel: z.string().nullable(),
  childComponentsLabel: z.string().nullable(),
})

export const cardBlocksSchema = z.strictObject({
  path: z.string(),
  blocks: z.array(cardBlockOptionSchema),
  message: z.string().nullable(),
})

export type ListCardBlocksInput = z.infer<typeof listCardBlocksInputSchema>
export type CardBlockOption = z.infer<typeof cardBlockOptionSchema>
export type CardBlocks = z.infer<typeof cardBlocksSchema>
