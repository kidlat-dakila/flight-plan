import type { FastifyInstance } from "fastify"
import type { ProcedureContext } from "@/procedures/context"
import { requestPermission, type PermissionDecision } from "@/procedures/request-permission"
import {
  permissionHookInputSchema,
  permissionHookOutputSchema,
  type PermissionHookInput,
  type PermissionHookOutput,
} from "@/procedures/request-permission/utils/schemas"
import { AGENT_HOOK_PATHS } from "@/procedures/save-setup-step/utils/claude-plugin"
import { toRouteSchema } from "@/server/api/route-schema"

const toHookOutput = (decision: PermissionDecision): PermissionHookOutput => {
  if (decision.kind === "unknown-session") return {}
  return {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: decision.kind === "allow" ? { behavior: "allow" } : { behavior: "deny", message: decision.message },
    },
  }
}

export const registerAgentPermissionRequestRoute = (server: FastifyInstance, context: ProcedureContext): void => {
  server.post<{ Body: PermissionHookInput }>(
    AGENT_HOOK_PATHS.permissionRequest,
    {
      schema: { body: toRouteSchema(permissionHookInputSchema), response: { 200: toRouteSchema(permissionHookOutputSchema) } },
    },
    async (request) => {
      const { session_id: sessionId, tool_name: toolName, tool_input: toolInput } = request.body
      return toHookOutput(await requestPermission({ sessionId, toolName, toolInput }, context))
    },
  )
}
