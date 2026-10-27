import { z } from "zod"

export const baseBranchNameSchema = z.string().trim().min(1)

export const baseBranchSelectionShape = {
  baseBranch: baseBranchNameSchema.nullable(),
}

export const setBaseBranchInputSchema = z.strictObject({
  repositoryName: z.string(),
  baseBranch: baseBranchNameSchema,
})

export const baseBranchChoiceSchema = z.strictObject({ baseBranch: z.string() })

export type SetBaseBranchInput = z.infer<typeof setBaseBranchInputSchema>
