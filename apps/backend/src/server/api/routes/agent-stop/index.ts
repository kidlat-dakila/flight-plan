import type { FastifyInstance } from "fastify"
import { closeAgent } from "@/procedures/close-agent"
import type { ProcedureContext } from "@/procedures/context"
import { endAgentTurn, type TurnEnding } from "@/procedures/end-agent-turn"
import {
  stopHookInputSchema,
  stopHookOutputSchema,
  type StopHookInput,
  type StopHookOutput,
} from "@/procedures/end-agent-turn/utils/schemas"
import { AGENT_HOOK_PATHS } from "@/procedures/save-setup-step/utils/claude-plugin"
import { toRouteSchema } from "@/server/api/route-schema"

export const AGENT_CLOSE_DELAY_MS = 1500

const toHookOutput = (ending: TurnEnding): StopHookOutput =>
  ending.kind === "continue" ? { decision: "block", reason: ending.reason } : {}

export const registerAgentStopRoute = (server: FastifyInstance, context: ProcedureContext): void => {
  server.post<{ Body: StopHookInput }>(
    AGENT_HOOK_PATHS.stop,
    { schema: { body: toRouteSchema(stopHookInputSchema), response: { 200: toRouteSchema(stopHookOutputSchema) } } },
    async (request) => {
      const ending = await endAgentTurn(
        { sessionId: request.body.session_id, lastAssistantMessage: request.body.last_assistant_message ?? null },
        context,
      )
      if (ending.kind === "close") {
        setTimeout(() => {
          closeAgent(ending.key, "turn-ended", context)
        }, AGENT_CLOSE_DELAY_MS).unref()
      }
      return toHookOutput(ending)
    },
  )
}
