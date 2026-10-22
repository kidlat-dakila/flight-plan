import { getLiveAgent } from "@/procedures/get-live-agent"
import { getLiveAgentInputSchema, liveAgentSchema } from "@/procedures/get-live-agent/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getLiveAgentRoute = publicProcedure
  .input(getLiveAgentInputSchema)
  .output(liveAgentSchema)
  .query(async ({ ctx, input }) => await getLiveAgent(input, ctx))
