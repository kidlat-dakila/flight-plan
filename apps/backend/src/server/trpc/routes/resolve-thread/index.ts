import { reviewActionOutputSchema } from "@/procedures/get-review/utils/schemas-review-action"
import { resolveThread } from "@/procedures/resolve-thread"
import { resolveThreadInputSchema } from "@/procedures/resolve-thread/utils/schemas"
import { toActionOutput } from "@/server/trpc/review-action-output"
import { publicProcedure } from "@/server/trpc/trpc"

export const resolveThreadRoute = publicProcedure
  .input(resolveThreadInputSchema)
  .output(reviewActionOutputSchema)
  .mutation(async ({ ctx, input }) => toActionOutput(await resolveThread(input, ctx)))
