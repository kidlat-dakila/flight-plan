import sensible from "@fastify/sensible"
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify"
import { registerMcp } from "./mcp"
import { registerTrpc } from "./trpc"

const TRPC_BATCH_PARAM_LENGTH = 5000

export const buildServer = async (options: FastifyServerOptions = {}): Promise<FastifyInstance> => {
  const server = Fastify({ maxParamLength: TRPC_BATCH_PARAM_LENGTH, ...options })
  await server.register(sensible)
  await registerTrpc(server)
  registerMcp(server)
  return server
}
