import { publicProcedure } from "@/trpc/procedures"

export const healthProcedure = publicProcedure.query(() => ({ status: "ok" as const }))
