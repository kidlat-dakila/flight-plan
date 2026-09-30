import { initTRPC } from "@trpc/server"

const trpc = initTRPC.create()

export const createRouter = trpc.router
export const publicProcedure = trpc.procedure
