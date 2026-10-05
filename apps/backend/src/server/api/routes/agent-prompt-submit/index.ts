import type { FastifyInstance } from "fastify"
import type { ProcedureContext } from "@/procedures/context"
import { recordAgentActivity } from "@/procedures/record-agent-activity"
import {
  agentHookInputSchema,
  emptyHookOutputSchema,
  type AgentHookInput,
} from "@/procedures/record-agent-activity/utils/schemas"
import { AGENT_HOOK_PATHS } from "@/procedures/save-setup-step/utils/claude-plugin"
import { toRouteSchema } from "@/server/api/route-schema"

export const registerAgentPromptSubmitRoute = (server: FastifyInstance, context: ProcedureContext): void => {
  server.post<{ Body: AgentHookInput }>(
    AGENT_HOOK_PATHS.promptSubmit,
    { schema: { body: toRouteSchema(agentHookInputSchema), response: { 200: toRouteSchema(emptyHookOutputSchema) } } },
    async (request) => {
      await recordAgentActivity({ sessionId: request.body.session_id }, context)
      return {}
    },
  )
}
