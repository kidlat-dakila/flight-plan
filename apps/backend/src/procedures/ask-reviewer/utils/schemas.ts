import { z } from "zod"

const MAX_QUESTIONS = 10
const MAX_OPTIONS = 8
const MAX_PROMPT_LENGTH = 2_000
const MAX_LABEL_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 500

const askedOptionSchema = z.strictObject({
  label: z.string().trim().min(1).max(MAX_LABEL_LENGTH).describe("A short choice the reviewer can pick."),
  description: z.string().trim().max(MAX_DESCRIPTION_LENGTH).default("").describe("What picking it means."),
})

const askedQuestionSchema = z.strictObject({
  prompt: z.string().trim().min(1).max(MAX_PROMPT_LENGTH).describe("The question, as a full sentence."),
  options: z
    .array(askedOptionSchema)
    .max(MAX_OPTIONS)
    .default([])
    .describe("Choices to pick from. Leave empty for a free-text answer. The reviewer can always write their own answer."),
  allowsMultiple: z.boolean().default(false).describe("Whether the reviewer may pick several options."),
})

export const askReviewerInputShape = {
  repositoryName: z.string().min(1).describe("The repository's name in Flight Plan."),
  targetId: z.string().min(1).describe("pr-<number> for a pull request, branch-<name> for a branch."),
  questions: z.array(askedQuestionSchema).min(1).max(MAX_QUESTIONS).describe("One question, or a batch asked together."),
}

export const askReviewerInputSchema = z.strictObject(askReviewerInputShape)

export type AskReviewerInput = z.infer<typeof askReviewerInputSchema>
export type AskedQuestion = AskReviewerInput["questions"][number]

export type ReviewerAsking
  = | { readonly kind: "asked", readonly batchId: string, readonly note: string }
    | { readonly kind: "rejected", readonly message: string }
