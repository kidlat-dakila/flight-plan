import { z } from "zod"
import type { InstructionIndex, ResolvedField } from "./resolve-instructions"

export const getInstructionsInputShape = {
  repositoryName: z.string().min(1).describe("The repository's name in Flight Plan."),
  targetId: z.string().min(1).describe("pr-<number> for a pull request, branch-<name> for a branch."),
  fields: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe("Dotted paths from the index, for example walkthrough.files.waypoints.reading. Returns what each field is and how to write it."),
  all: z
    .boolean()
    .optional()
    .describe("Every field at once. Large. The index and `fields` are what you want."),
}

export const getInstructionsInputSchema = z.strictObject(getInstructionsInputShape)

export type GetInstructionsInput = z.infer<typeof getInstructionsInputSchema>

export type InstructionsResult
  = | { readonly kind: "indexed", readonly index: InstructionIndex }
    | { readonly kind: "resolved", readonly configuration: string, readonly fields: readonly ResolvedField[] }
    | { readonly kind: "rejected", readonly message: string }
