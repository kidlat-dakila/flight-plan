import { z } from "zod"
import { formatGreeting } from "@/greeting/format-greeting"
import { createRouter, publicProcedure } from "./procedures"

const greetingInput = z.object({ name: z.string().min(1) })

export const appRouter = createRouter({
  health: publicProcedure.query(() => ({ status: "ok" as const })),
  greeting: publicProcedure
    .input(greetingInput)
    .query(({ input }) => formatGreeting(input.name)),
})

export type AppRouter = typeof appRouter
