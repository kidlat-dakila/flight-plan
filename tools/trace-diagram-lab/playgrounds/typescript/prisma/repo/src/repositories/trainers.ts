import { db } from "~/db"

export function findTrainers() {
  return db.trainer.findMany({ orderBy: { name: "asc" } })
}
