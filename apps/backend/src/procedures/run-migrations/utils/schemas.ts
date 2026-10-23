import { z } from "zod"

export const initRecordSchema = z.strictObject({
  migratedVersion: z.string(),
})

export type InitRecord = z.infer<typeof initRecordSchema>
