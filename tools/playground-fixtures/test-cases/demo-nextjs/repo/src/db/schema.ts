import { integer, pgTable, serial, text } from "drizzle-orm/pg-core"

export const trainers = pgTable("trainers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hometown: text("hometown").notNull(),
})

export const pokemon = pgTable("pokemon", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  primaryType: text("primary_type").notNull(),
  trainerId: integer("trainer_id").references(() => trainers.id),
})

export type Trainer = typeof trainers.$inferSelect
export type Pokemon = typeof pokemon.$inferSelect
export type NewPokemon = typeof pokemon.$inferInsert
