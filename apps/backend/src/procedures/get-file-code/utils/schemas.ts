import { z } from "zod"
import { codeLineSchema } from "@flightplan/configurations"

export const getFileCodeInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  path: z.string(),
})

export const fileCodeSchema = z.strictObject({
  path: z.string(),
  lines: z.array(codeLineSchema),
})

export type GetFileCodeInput = z.infer<typeof getFileCodeInputSchema>
export type FileCode = z.infer<typeof fileCodeSchema>
