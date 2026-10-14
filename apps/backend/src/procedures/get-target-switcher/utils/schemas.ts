import { z } from "zod"
import { reviewTargetStopSchema } from "@/procedures/list-repositories/utils/schemas"

export const getTargetSwitcherInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  query: z.string(),
})

export const targetSwitcherSchema = z.strictObject({
  heading: z.string(),
  searchPlaceholder: z.string(),
  emptyLabel: z.string().nullable(),
  currentTargetId: z.string(),
  targets: z.array(reviewTargetStopSchema),
})

export type GetTargetSwitcherInput = z.infer<typeof getTargetSwitcherInputSchema>
export type TargetSwitcher = z.infer<typeof targetSwitcherSchema>
