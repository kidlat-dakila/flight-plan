import type { FastifyInstance } from "fastify"
import { listPokemon } from "@/pokemon/controller"

export default async function pokemonRoutes(fastify: FastifyInstance) {
  fastify.get("/pokemon", listPokemon)
}
