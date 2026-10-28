import { initTRPC } from "@trpc/server"

export interface Context {
  trainerName: string | null
}

export const createContext = ({ req }: { req: Request }): Context => ({
  trainerName: req.headers.get("x-trainer"),
})

export const t = initTRPC.context<Context>().create()

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure
