import { initTRPC } from "@trpc/server"
import type { TrpcContext } from "./context"

const trpc = initTRPC.context<TrpcContext>().create()

export const createRouter = trpc.router
export const publicProcedure = trpc.procedure
