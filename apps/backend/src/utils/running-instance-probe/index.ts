import { z } from "zod"

const HEALTH_PATH = "/api/trpc/health"
const PROBE_TIMEOUT_MS = 1000

const healthResponseSchema = z.object({ result: z.object({ data: z.object({ status: z.literal("ok") }) }) })

export const isFlightPlanRunning = async (serverUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(`${serverUrl}${HEALTH_PATH}`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
    return healthResponseSchema.safeParse(await response.json()).success
  } catch {
    return false
  }
}
