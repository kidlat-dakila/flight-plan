import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify"
import type { FastifyInstance } from "fastify"
import { appRouter, type AppRouter } from "./router"

export const TRPC_PREFIX = "/api/trpc"

const trpcOptions: FastifyTRPCPluginOptions<AppRouter> = {
  prefix: TRPC_PREFIX,
  trpcOptions: { router: appRouter },
}

export const registerTrpc = async (server: FastifyInstance): Promise<void> => {
  await server.register(fastifyTRPCPlugin, trpcOptions)
}
