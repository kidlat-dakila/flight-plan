import type { StoredCodeBlock, StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import { codeOf, groupOf, rangeAt, type FixtureFiles } from "./group-fixture"

const SERVER_FILES: FixtureFiles = {
  "src/server/trpc.ts": codeOf("import { initTRPC } from \"@trpc/server\"", "export const t = initTRPC.create()"),
  "src/server/todos.ts": codeOf("export const saveTodo = (title) => {", "  return title.trim()", "}"),
  "src/server/todo-router.ts": codeOf(
    "import { t } from \"./trpc\"",
    "import { saveTodo } from \"./todos\"",
    "export const todoRouter = t.router({",
    "  create: t.procedure.mutation(({ input }) => saveTodo(input)),",
    "  list: t.procedure.query(() => []),",
    "})",
  ),
  "src/server/root.ts": codeOf(
    "import { t } from \"./trpc\"",
    "import { todoRouter } from \"./todo-router\"",
    "export const appRouter = t.router({ todo: todoRouter })",
    "export type AppRouter = typeof appRouter",
  ),
}
const ADD_TODO = codeOf(
  "import { api } from \"./trpc\"",
  "export const AddTodo = () => {",
  "  const createTodo = api.todo.create.useMutation()",
  "  return <button onClick={() => createTodo.mutate(\"a\")}>Add</button>",
  "}",
)
const SAVE_TODO_CHANGE = { "src/server/todos.ts": [rangeAt(2, 10, 2, 22)] }
const PROCEDURE = "src/server/todo-router.ts#resolver@4:11"

const clientFilesOf = (clientCode: string): FixtureFiles => ({
  ...SERVER_FILES,
  "src/client/trpc.ts": clientCode,
  "src/client/add-todo.tsx": ADD_TODO,
})

const TYPED_CLIENT = codeOf(
  "import { createTRPCReact } from \"@trpc/react-query\"",
  "import type { AppRouter } from \"../server/root\"",
  "export const api = createTRPCReact<AppRouter>()",
)
const UNTYPED_CLIENT = codeOf("import { createTRPCReact } from \"@trpc/react-query\"", "export const api = createTRPCReact()")

const requestOf = (group: StoredCodeGroupGraph): StoredCodeBlock | undefined =>
  group.codeBlocks.find((block) => block.filePath === "src/client/add-todo.tsx" && block.type === "request")

describe("the procedure a tRPC client calls", () => {
  it("steps from a call on a client to the procedure its path names, through the router the client is typed by and the routers joined into it", () => {
    const group = groupOf(clientFilesOf(TYPED_CLIENT), SAVE_TODO_CHANGE)

    expect(requestOf(group)?.nextBlockIds).toStrictEqual([PROCEDURE])
    expect(group.diffChainIds).toContain("src/client/add-todo.tsx#component@2:1")
  })

  it("steps to the procedure through the routers no other router joins, when the client names no router type", () => {
    const group = groupOf(clientFilesOf(UNTYPED_CLIENT), SAVE_TODO_CHANGE)

    expect(requestOf(group)?.nextBlockIds).toStrictEqual([PROCEDURE])
  })

  it("steps from a query hook on a client to the procedure of its path", () => {
    const files = {
      ...clientFilesOf(TYPED_CLIENT),
      "src/client/todo-list.tsx": codeOf(
        "import { api } from \"./trpc\"",
        "export const TodoList = () => {",
        "  const [todos] = api.todo.list.useSuspenseQuery()",
        "  return <ul>{todos.length}</ul>",
        "}",
      ),
    }
    const group = groupOf(files, { "src/server/todo-router.ts": [rangeAt(5, 31, 5, 33)] })
    const query = group.codeBlocks.find((block) => block.filePath === "src/client/todo-list.tsx" && block.type === "data-fetch")

    expect(query?.nextBlockIds).toStrictEqual(["src/server/todo-router.ts#resolver@5:9"])
  })

  it("takes no step from a call whose path names no procedure", () => {
    const files = { ...clientFilesOf(TYPED_CLIENT), "src/client/add-todo.tsx": ADD_TODO.replace("api.todo.create", "api.todo.remove") }
    const group = groupOf(files, SAVE_TODO_CHANGE)

    expect(requestOf(group)?.nextBlockIds).toStrictEqual([])
  })
})
