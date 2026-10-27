import { readTask, readTasks } from "./store"
import type { Task } from "./task"

export const listTasks = (): Task[] => readTasks()

export const findTask = (id: number): Task | undefined => readTask(id)
