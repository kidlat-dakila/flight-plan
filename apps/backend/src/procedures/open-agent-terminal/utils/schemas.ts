import { z } from "zod"

export const openAgentTerminalInputSchema = z.strictObject({
  repositoryName: z.string().min(1),
  targetId: z.string().min(1),
})

export const agentTerminalOpeningSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("opened"), message: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type OpenAgentTerminalInput = z.infer<typeof openAgentTerminalInputSchema>
export type AgentTerminalOpening = z.infer<typeof agentTerminalOpeningSchema>
