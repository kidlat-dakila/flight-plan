import type { Task } from "./task"

const tasks = new Map<number, Task>([
  [1, { id: 1, title: "Write the release notes", isDone: false }],
  [2, { id: 2, title: "Review the pull request", isDone: true }],
])

export const readTasks = (): Task[] => [...tasks.values()]

export const readTask = (id: number): Task | undefined => tasks.get(id)
