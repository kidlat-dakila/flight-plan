import { saveSetupStep } from "@/procedures/save-setup-step"
import { saveSetupStepInputSchema, stepSavingSchema } from "@/procedures/save-setup-step/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const saveSetupStepRoute = publicProcedure
  .input(saveSetupStepInputSchema)
  .output(stepSavingSchema)
  .mutation(async ({ ctx, input }) => saveSetupStep(input, ctx))
