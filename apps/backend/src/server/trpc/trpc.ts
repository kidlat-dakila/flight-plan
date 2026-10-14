import { initTRPC } from "@trpc/server"
import type { ProcedureContext } from "@/procedures/context"

const trpc = initTRPC.context<ProcedureContext>().create({ allowOutsideOfServer: true })

export const createRouter = trpc.router
export const publicProcedure = trpc.procedure
