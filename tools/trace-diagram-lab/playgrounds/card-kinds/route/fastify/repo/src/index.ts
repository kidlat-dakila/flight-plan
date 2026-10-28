import Fastify from "fastify"
import pokemonRoutes from "@/pokemon/routes"
import trainerRoutes from "@/trainers/routes"

const PORT = 3000

const app = Fastify({ logger: true })

app.register(trainerRoutes, { prefix: "/api" })
app.register(pokemonRoutes, { prefix: "/api" })

app.listen({ port: PORT })
