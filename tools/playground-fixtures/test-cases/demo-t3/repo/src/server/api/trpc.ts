import { initTRPC } from "@trpc/server"
import superjson from "superjson"
import { db } from "~/server/db"

export const createTRPCContext = async (opts: { headers: Headers }) => ({ db, ...opts })

const t = initTRPC.context<typeof createTRPCContext>().create({ transformer: superjson })

export const createCallerFactory = t.createCallerFactory
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure
