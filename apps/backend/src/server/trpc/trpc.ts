import { initTRPC } from "@trpc/server"
import type { ProcedureContext } from "@/procedures/context"

const UNKNOWN_PATH = "unknown"

export const trpcSourceOf = (path: string | undefined): string => `tRPC ${path ?? UNKNOWN_PATH}`

export const failureOf = (error: Error): unknown => error.cause ?? error

const trpc = initTRPC.context<ProcedureContext>().create({
  allowOutsideOfServer: true,
  errorFormatter: ({ shape, error, ctx }) => ({
    ...shape,
    data: { ...shape.data, logId: ctx?.errorLog.logIdOf(failureOf(error)) ?? null },
  }),
})

export const createRouter = trpc.router
export const publicProcedure = trpc.procedure
