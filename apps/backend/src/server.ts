import sensible from "@fastify/sensible"
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify"
import { registerMcp } from "./mcp"
import { createMockTrpcContext, type TrpcContext } from "./trpc/context"
import { registerTrpc } from "./trpc/plugin"

const TRPC_BATCH_PARAM_LENGTH = 5000

export const buildServer = async (
  options: FastifyServerOptions = {},
  trpcContext: TrpcContext = createMockTrpcContext(new Date()),
): Promise<FastifyInstance> => {
  const server = Fastify({ maxParamLength: TRPC_BATCH_PARAM_LENGTH, ...options })
  await server.register(sensible)
  await registerTrpc(server, trpcContext)
  registerMcp(server)
  return server
}
