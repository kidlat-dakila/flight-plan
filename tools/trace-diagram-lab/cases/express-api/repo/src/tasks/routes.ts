import { Router } from "express"
import { findTask, listTasks } from "./service"

export const tasksRouter = Router()

tasksRouter.get("/", (_req, res) => {
  res.json(listTasks())
})

tasksRouter.get("/:id", (req, res) => {
  const task = findTask(Number(req.params.id))
  if (task === undefined) {
    res.status(404).end()
    return
  }
  res.json(task)
})
