import { z } from "zod"

const MAX_ANSWER_LENGTH = 10_000

export const answerQuestionsInputSchema = z.strictObject({
  repositoryName: z.string().min(1),
  targetId: z.string().min(1),
  batchId: z.string().min(1),
  answers: z.array(
    z.strictObject({
      questionId: z.string().min(1),
      pickedLabels: z.array(z.string()),
      text: z.string().max(MAX_ANSWER_LENGTH).nullable(),
    }),
  ),
})

export const answeringSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("accepted") }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string(), questionId: z.string().nullable() }),
])

export type AnswerQuestionsInput = z.infer<typeof answerQuestionsInputSchema>
export type Answering = z.infer<typeof answeringSchema>
