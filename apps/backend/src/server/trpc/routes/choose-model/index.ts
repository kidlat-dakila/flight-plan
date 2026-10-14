import { chooseModel } from "@/procedures/choose-model"
import { chooseModelInputSchema, modelChoosingSchema } from "@/procedures/choose-model/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const chooseModelRoute = publicProcedure
  .input(chooseModelInputSchema)
  .output(modelChoosingSchema)
  .mutation(async ({ ctx, input }) => chooseModel(input, ctx))
