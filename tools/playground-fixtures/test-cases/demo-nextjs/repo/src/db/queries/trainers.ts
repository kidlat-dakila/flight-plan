import { asc } from "drizzle-orm"
import { db } from "@/db"
import { trainers, type Trainer } from "@/db/schema"

export function findTrainers(): Promise<Trainer[]> {
  return db.select().from(trainers).orderBy(asc(trainers.name))
}
