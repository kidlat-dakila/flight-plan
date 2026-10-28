import { Router } from "express"
import { readTrainers } from "@/trainers/store"

export const trainersRouter = Router()

trainersRouter.get("/trainers", (_req, res) => {
  res.json(readTrainers())
})
