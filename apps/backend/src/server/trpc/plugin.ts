import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify"
import type { FastifyInstance } from "fastify"
import type { ProcedureContext } from "@/procedures/context"
import { appRouter, type AppRouter } from "./router"
import { failureOf, trpcSourceOf } from "./trpc"

export const TRPC_PREFIX = "/api/trpc"

const trpcOptions = (context: ProcedureContext): FastifyTRPCPluginOptions<AppRouter> => ({
  prefix: TRPC_PREFIX,
  trpcOptions: {
    router: appRouter,
    createContext: () => context,
    onError: ({ error, path }) => {
      context.errorLog.recordFailure(trpcSourceOf(path), failureOf(error))
    },
  },
})

export const registerTrpc = async (server: FastifyInstance, context: ProcedureContext): Promise<void> => {
  await server.register(fastifyTRPCPlugin, trpcOptions(context))
}
