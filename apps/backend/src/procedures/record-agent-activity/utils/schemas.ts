import { z } from "zod"

export const agentHookInputSchema = z.looseObject({ session_id: z.string().min(1) })

export const emptyHookOutputSchema = z.strictObject({})

export type AgentHookInput = z.infer<typeof agentHookInputSchema>
