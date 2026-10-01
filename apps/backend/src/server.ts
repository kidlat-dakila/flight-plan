import sensible from "@fastify/sensible"
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify"
import { createMockProcedureContext, type ProcedureContext } from "./procedures/context"
import { registerMcp } from "./server/mcp/plugin"
import { registerTrpc } from "./server/trpc/plugin"

const TRPC_BATCH_PARAM_LENGTH = 5000

export const buildServer = async (
  options: FastifyServerOptions = {},
  context: ProcedureContext = createMockProcedureContext(new Date()),
): Promise<FastifyInstance> => {
  const server = Fastify({ maxParamLength: TRPC_BATCH_PARAM_LENGTH, ...options })
  await server.register(sensible)
  await registerTrpc(server, context)
  registerMcp(server)
  return server
}
