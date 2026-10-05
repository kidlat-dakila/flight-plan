import sse from "@fastify/sse"
import type { FastifyInstance } from "fastify"
import type { ProcedureContext } from "@/procedures/context"
import { registerAgentPermissionRequestRoute } from "./routes/agent-permission-request"
import { registerAgentPromptSubmitRoute } from "./routes/agent-prompt-submit"
import { registerAgentStopRoute } from "./routes/agent-stop"
import { registerAgentToolUseRoute } from "./routes/agent-tool-use"
import { registerListenForReviewerRoute } from "./routes/listen-for-reviewer"

export const registerApi = async (server: FastifyInstance, context: ProcedureContext): Promise<void> => {
  await server.register(sse)
  registerListenForReviewerRoute(server, context)
  registerAgentPromptSubmitRoute(server, context)
  registerAgentToolUseRoute(server, context)
  registerAgentPermissionRequestRoute(server, context)
  registerAgentStopRoute(server, context)
}
