import sensible from "@fastify/sensible"
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify"
import { createMockProcedureContext, type ProcedureContext } from "./procedures/context"
import { registerApi } from "./server/api/plugin"
import { registerMcp } from "./server/mcp/plugin"
import { registerTrpc } from "./server/trpc/plugin"
import { registerWeb } from "./server/web/plugin"

const TRPC_BATCH_PARAM_LENGTH = 5000
const UNKNOWN_ROUTE = "an unknown route"

export const requestSourceOf = (method: string, route: string | undefined): string => `Request ${method} ${route ?? UNKNOWN_ROUTE}`

export const buildServer = async (
  options: FastifyServerOptions = {},
  context: ProcedureContext = createMockProcedureContext(new Date()),
  webPath: string | null = null,
): Promise<FastifyInstance> => {
  const server = Fastify({ maxParamLength: TRPC_BATCH_PARAM_LENGTH, ...options })
  await server.register(sensible)
  server.addHook("onError", async (request, _reply, error) => {
    await context.errorLog.recordFailure(requestSourceOf(request.method, request.routeOptions.url), error).saving
  })
  await registerTrpc(server, context)
  registerMcp(server, context)
  await registerApi(server, context)
  server.addHook("onClose", async () => {
    await context.conversationEnvironment.hub.close()
  })
  if (webPath !== null) await registerWeb(server, webPath)
  return server
}
