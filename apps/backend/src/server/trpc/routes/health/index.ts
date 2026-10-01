import { health } from "@/procedures/health"
import { publicProcedure } from "@/server/trpc/trpc"

export const healthRoute = publicProcedure.query(() => health())
