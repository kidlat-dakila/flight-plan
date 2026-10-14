import fastifyStatic from "@fastify/static"
import type { FastifyInstance } from "fastify"
import { isPageRequest } from "./page-request"

const INDEX_FILE_NAME = "index.html"

export const registerWeb = async (server: FastifyInstance, webPath: string): Promise<void> => {
  await server.register(fastifyStatic, { root: webPath, wildcard: false })
  server.setNotFoundHandler(async (request, reply) =>
    isPageRequest(request.method, request.url) ? await reply.sendFile(INDEX_FILE_NAME) : reply.notFound(),
  )
}
