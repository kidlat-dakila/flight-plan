import type { FastifyInstance } from "fastify"
import { readTrainers } from "@/trainers/store"

export default async function trainerRoutes(fastify: FastifyInstance) {
  fastify.get("/trainers", async () => readTrainers())
}
