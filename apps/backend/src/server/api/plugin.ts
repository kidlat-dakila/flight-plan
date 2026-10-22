import sse from "@fastify/sse"
import type { FastifyInstance } from "fastify"
import type { ProcedureContext } from "@/procedures/context"
import { registerListenForReviewerRoute } from "./routes/listen-for-reviewer"

export const registerApi = async (server: FastifyInstance, context: ProcedureContext): Promise<void> => {
  await server.register(sse)
  registerListenForReviewerRoute(server, context)
}
