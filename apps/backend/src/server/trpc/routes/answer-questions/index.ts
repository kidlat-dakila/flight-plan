import { answerQuestions } from "@/procedures/answer-questions"
import { answerQuestionsInputSchema, answeringSchema } from "@/procedures/answer-questions/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const answerQuestionsRoute = publicProcedure
  .input(answerQuestionsInputSchema)
  .output(answeringSchema)
  .mutation(async ({ ctx, input }) => answerQuestions(input, ctx))
