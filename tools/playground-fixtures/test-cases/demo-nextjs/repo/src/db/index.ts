import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema"

const DATABASE_URL = "postgres://pokedex:pokedex@localhost:5432/pokedex"

export const db = drizzle(DATABASE_URL, { schema })
