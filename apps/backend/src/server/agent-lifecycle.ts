import type { FastifyInstance } from "fastify"
import { closeAllAgents } from "@/procedures/close-all-agents"
import { closeIdleAgents } from "@/procedures/close-idle-agents"
import type { ProcedureContext } from "@/procedures/context"

const AGENT_SWEEP_INTERVAL_MS = 15_000

export const registerAgentLifecycle = (server: FastifyInstance, context: ProcedureContext): void => {
  const sweep = setInterval(() => {
    closeIdleAgents(context).catch((error: unknown) => {
      server.log.error({ err: error }, "closing idle agents failed")
    })
  }, AGENT_SWEEP_INTERVAL_MS)
  sweep.unref()
  server.addHook("onClose", async () => {
    clearInterval(sweep)
    closeAllAgents(context)
    await context.conversationEnvironment.hub.close()
  })
}
