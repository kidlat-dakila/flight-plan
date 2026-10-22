import { openAgentTerminal } from "@/procedures/open-agent-terminal"
import { agentTerminalOpeningSchema, openAgentTerminalInputSchema } from "@/procedures/open-agent-terminal/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const openAgentTerminalRoute = publicProcedure
  .input(openAgentTerminalInputSchema)
  .output(agentTerminalOpeningSchema)
  .mutation(async ({ ctx, input }) => await openAgentTerminal(input, ctx))
