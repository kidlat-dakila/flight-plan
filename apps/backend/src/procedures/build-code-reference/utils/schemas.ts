import { z } from "zod"

export const buildCodeReferenceInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  path: z.string(),
  lineStart: z.number().int().positive(),
  lineEnd: z.number().int().positive(),
})

export const codeReferenceSchema = z.strictObject({ reference: z.string(), copiedMessage: z.string() })

export type BuildCodeReferenceInput = z.infer<typeof buildCodeReferenceInputSchema>
export type CodeReference = z.infer<typeof codeReferenceSchema>
