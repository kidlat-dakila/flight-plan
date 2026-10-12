import { z } from "zod"
import { startFormSchema } from "@/procedures/get-review/utils/schemas"
import { REBUILD_MODES } from "@/procedures/rebuild-review/utils/schemas"

export const getRebuildFormInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  mode: z.enum(REBUILD_MODES),
})

export const rebuildFormSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  form: startFormSchema,
})

export type GetRebuildFormInput = z.infer<typeof getRebuildFormInputSchema>
export type RebuildForm = z.infer<typeof rebuildFormSchema>
