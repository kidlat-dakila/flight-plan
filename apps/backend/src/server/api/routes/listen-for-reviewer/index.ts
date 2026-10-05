import type { FastifyInstance } from "fastify"
import type { ProcedureContext } from "@/procedures/context"
import { LISTEN_PATH_SUFFIX } from "@/procedures/get-conversation/utils/agent-text"
import { listenForReviewer, type ListenPacket } from "@/procedures/listen-for-reviewer"
import {
  listenParamsSchema,
  listenRejectionSchema,
  type ListenParams,
} from "@/procedures/listen-for-reviewer/utils/schemas"
import { toRouteSchema } from "@/server/api/route-schema"

export const LISTEN_ROUTE = `/api/:repositoryName/:targetId/${LISTEN_PATH_SUFFIX}`

const HTTP_NOT_FOUND = 404
const REPLY_EVENT = "reply"

const passText = (data: unknown): string => String(data)

const toMessages = async function* (packets: AsyncIterable<ListenPacket>) {
  for await (const packet of packets) {
    yield { id: String(packet.throughSequence), event: REPLY_EVENT, data: packet.text }
  }
}

export const registerListenForReviewerRoute = (server: FastifyInstance, context: ProcedureContext): void => {
  server.get<{ Params: ListenParams }>(
    LISTEN_ROUTE,
    {
      sse: { kind: "manual", heartbeat: false, serializer: passText },
      schema: {
        params: toRouteSchema(listenParamsSchema),
        response: { [HTTP_NOT_FOUND]: toRouteSchema(listenRejectionSchema) },
      },
    },
    async (request, reply) => {
      const disconnection = new AbortController()
      reply.raw.once("close", () => {
        disconnection.abort()
      })
      const listening = await listenForReviewer(request.params, context, disconnection.signal)
      if (listening.kind === "rejected") return await reply.code(HTTP_NOT_FOUND).send({ message: listening.message })
      await reply.sse.send(toMessages(listening.packets))
      reply.sse.close()
      return reply
    },
  )
}
