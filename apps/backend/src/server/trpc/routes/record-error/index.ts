import { recordError } from "@/procedures/record-error"
import { recordedErrorSchema, recordErrorInputSchema } from "@/procedures/record-error/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const recordErrorRoute = publicProcedure
  .input(recordErrorInputSchema)
  .output(recordedErrorSchema)
  .mutation(async ({ ctx, input }) => await recordError(input, ctx))
