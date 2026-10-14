import { conversationKeySchema } from "@/procedures/get-conversation/utils/schemas"
import { getModelChoice } from "@/procedures/get-model-choice"
import { modelChoiceViewSchema } from "@/procedures/get-model-choice/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getModelChoiceRoute = publicProcedure
  .input(conversationKeySchema)
  .output(modelChoiceViewSchema.nullable())
  .query(async ({ ctx, input }) => getModelChoice(input, ctx))
