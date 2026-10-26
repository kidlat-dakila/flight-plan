import { join } from "node:path"
import { buildBranchCodegraph } from "@flightplan/codegraph"
import { assembleGitAdapter, type GitAdapter } from "@flightplan/git-forge"
import { CASE_REF, setupTest } from "@flightplan/playground-fixtures/test-setup"
import { expectTraceSnapshot } from "@test-setup/trace-snapshot"

const REPO_PATH = join(import.meta.dirname, "repo")

const openRepository = async (root: string): Promise<GitAdapter> => {
  const resolved = await assembleGitAdapter({ id: "git", root, secret: null, username: "", baseUrl: "" })
  if (!resolved.ok) throw resolved.error
  return resolved.gitAdapter
}

describe("express-api", () => {
  it("Implement route PATCH /tasks/:id/complete", async () => {
    setupTest({
      repoPath: REPO_PATH,
      diffs: [
        [
          "diff --git a/src/tasks/store.ts b/src/tasks/store.ts",
          "--- a/src/tasks/store.ts",
          "+++ b/src/tasks/store.ts",
          "@@ -10,0 +11,5 @@ export const readTask = (id: number): Task | undefined => tasks.get(id)",
          "+",
          "+export const saveTask = (task: Task): Task => {",
          "+  tasks.set(task.id, task)",
          "+  return task",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/tasks/service.ts b/src/tasks/service.ts",
          "--- a/src/tasks/service.ts",
          "+++ b/src/tasks/service.ts",
          "@@ -1 +1 @@",
          "-import { readTask, readTasks } from \"./store\"",
          "+import { readTask, readTasks, saveTask } from \"./store\"",
          "@@ -6,0 +7,5 @@ export const findTask = (id: number): Task | undefined => readTask(id)",
          "+",
          "+export const completeTask = (id: number): Task | undefined => {",
          "+  const task = readTask(id)",
          "+  return task === undefined ? undefined : saveTask({ ...task, isDone: true })",
          "+}",
        ].join("\n"),
        [
          "diff --git a/src/tasks/routes.ts b/src/tasks/routes.ts",
          "--- a/src/tasks/routes.ts",
          "+++ b/src/tasks/routes.ts",
          "@@ -1,2 +1,2 @@",
          "-import { Router } from \"express\"",
          "-import { findTask, listTasks } from \"./service\"",
          "+import { Router, type NextFunction, type Request, type Response } from \"express\"",
          "+import { completeTask, findTask, listTasks } from \"./service\"",
          "@@ -5,0 +6,9 @@ export const tasksRouter = Router()",
          "+const requireTaskId = (req: Request, res: Response, next: NextFunction) => {",
          "+  const id = Number(req.params.id)",
          "+  if (!Number.isInteger(id) || id <= 0) {",
          "+    res.status(400).json({ error: \"The task id is not a number.\" })",
          "+    return",
          "+  }",
          "+  next()",
          "+}",
          "+",
          "@@ -17,0 +27,9 @@ tasksRouter.get(\"/:id\", (req, res) => {",
          "+",
          "+tasksRouter.patch(\"/:id/complete\", requireTaskId, (req, res) => {",
          "+  const task = completeTask(Number(req.params.id))",
          "+  if (task === undefined) {",
          "+    res.status(404).end()",
          "+    return",
          "+  }",
          "+  res.json(task)",
          "+})",
        ].join("\n"),
      ],
    })

    const codegraph = await buildBranchCodegraph({ gitAdapter: await openRepository(REPO_PATH), ref: CASE_REF, isSegmented: true })

    await expectTraceSnapshot(codegraph)
  })
})
