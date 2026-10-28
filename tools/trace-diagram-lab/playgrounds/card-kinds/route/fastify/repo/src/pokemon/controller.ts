import type { FastifyReply, FastifyRequest } from "fastify"
import { readParty } from "@/pokemon/store"

export const listPokemon = async (_request: FastifyRequest, reply: FastifyReply) => {
  reply.send(readParty())
}
