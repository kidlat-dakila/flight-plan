import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify"
import type { FastifyInstance } from "fastify"
import type { TrpcContext } from "./context"
import { appRouter, type AppRouter } from "./router"

export const TRPC_PREFIX = "/api/trpc"

const trpcOptions = (context: TrpcContext): FastifyTRPCPluginOptions<AppRouter> => ({
  prefix: TRPC_PREFIX,
  trpcOptions: { router: appRouter, createContext: () => context },
})

export const registerTrpc = async (server: FastifyInstance, context: TrpcContext): Promise<void> => {
  await server.register(fastifyTRPCPlugin, trpcOptions(context))
}
