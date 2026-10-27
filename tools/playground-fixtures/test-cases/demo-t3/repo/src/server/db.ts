import { PrismaClient } from "@prisma/client"

const DATABASE_URL = "postgresql://pokedex:pokedex@localhost:5432/pokedex"

export const db = new PrismaClient({ datasourceUrl: DATABASE_URL })
