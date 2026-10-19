import { createSegment, createViewContext } from "@/__tests__/review-fixture"
import { codeOf, rangeAt, type FixtureDiffs, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import { buildTrace } from "@/trace/build"
import { presentDiagramOf } from "@/trace-diagram/__tests__/diagram-fixture"
import type { TraceNodeView } from "@flightplan/configurations"

const listNodeViews = (nodes: readonly TraceNodeView[]): TraceNodeView[] => nodes.flatMap((node) => [node, ...listNodeViews(node.children)])

const nodeViewNamed = (files: FixtureFiles, diffs: FixtureDiffs, name: string): TraceNodeView | undefined => {
  const segment = createSegment({ traceDiagram: presentDiagramOf(files, diffs) })
  return listNodeViews(buildTrace(segment, "", [], createViewContext()).diagram?.nodes ?? []).find((node) => node.name === name)
}

const groupsOf = (node: TraceNodeView | undefined): [string | null, number, string[]][] =>
  (node?.rowGroups ?? []).map(({ label, rowIds, childIds }) => [label, rowIds.length, childIds.map((childId) => node?.children.find((child) => child.id === childId)?.name ?? childId)])

describe("the row groups of a class card", () => {
  it("groups the properties under Properties and the method cards under Methods", () => {
    const store = codeOf("export class Store {", "  items = []", "  add(item) {", "    log(item)", "  }", "}")
    const node = nodeViewNamed({ "src/store.ts": store }, { "src/store.ts": [rangeAt(2, 3, 2, 13), rangeAt(4, 5, 4, 14)] }, "Store")

    expect(groupsOf(node)).toStrictEqual([["Properties", 1, []], ["Methods", 0, ["Store.add"]]])
    expect(node?.blockLists.map(({ kind, label }) => [kind, label])).toStrictEqual([["property", "Properties"]])
  })
})

describe("the row groups of a function that returns a function", () => {
  it("groups its rows as a component does, and keeps the returned function as its child", () => {
    const save = codeOf(
      "import { keyOf } from \"./keys\"",
      "export const createSaveHandler = (userId) => {",
      "  const key = keyOf(userId)",
      "  return (draft) => save(key, draft)",
      "}",
    )
    const node = nodeViewNamed({ "src/save.ts": save }, { "src/save.ts": [rangeAt(3, 3, 3, 28), rangeAt(4, 21, 4, 37)] }, "createSaveHandler")

    expect(groupsOf(node).map(([label]) => label)).toStrictEqual(["Calls"])
    expect(node?.children.map((child) => child.type)).toStrictEqual(["function"])
  })
})

describe("the row groups of a route card", () => {
  it("heads the card with its path, reads Route, lists no row and groups its handlers by method", () => {
    const routes = codeOf(
      "import express from \"express\"",
      "import { listUsers } from \"./list\"",
      "const router = express.Router()",
      "router.get(\"/api/users\", listUsers)",
      "router.post(\"/api/users\", async (req, res) => {",
      "  await db.user.create(req.body)",
      "})",
      "export default router",
    )
    const files = { "server/routes.ts": routes, "server/list.ts": codeOf("export const listUsers = async (req, res) => {", "  res.json(await db.user.findMany())", "}") }
    const node = nodeViewNamed(files, { "server/routes.ts": [rangeAt(6, 3, 6, 33)], "server/list.ts": [rangeAt(2, 3, 2, 38)] }, "/api/users")

    expect(node?.typeLabel).toBe("Route")
    expect(node?.blockLists).toStrictEqual([])
    expect(groupsOf(node).map(([label, rowCount, childNames]) => [label, rowCount, childNames.length])).toStrictEqual([["POST", 0, 1], ["GET", 0, 1]])
  })

  it("heads a handler registered for several methods with all of them, after the headings of one method", () => {
    const views = codeOf(
      "from flask import Flask",
      "app = Flask(__name__)",
      "@app.route(\"/users\", methods=[\"GET\", \"POST\"])",
      "def users():",
      "    return list_users()",
      "@app.delete(\"/users\")",
      "def remove_users():",
      "    return clear_users()",
    )
    const node = nodeViewNamed({ "shop/views.py": views }, { "shop/views.py": [rangeAt(5, 5, 5, 24), rangeAt(8, 5, 8, 25)] }, "/users")

    expect(groupsOf(node)).toStrictEqual([["DELETE", 0, ["remove_users"]], ["GET · POST", 0, ["users"]]])
  })
})

describe("the cards of Next.js", () => {
  const manifest = JSON.stringify({ dependencies: { next: "16.0.0" } })

  it("heads a route file with its path and groups the methods it exports", () => {
    const route = codeOf("export async function GET() {", "  return Response.json(await db.user.findMany())", "}", "export async function POST(request) {", "  await db.user.create(await request.json())", "}")
    const node = nodeViewNamed({ "package.json": manifest, "app/api/users/route.ts": route }, { "app/api/users/route.ts": [rangeAt(2, 3, 2, 50), rangeAt(5, 3, 5, 45)] }, "/api/users")

    expect(node?.typeLabel).toBe("Route")
    expect(groupsOf(node)).toStrictEqual([["POST", 0, ["POST"]], ["GET", 0, ["GET"]]])
  })

  it("reads Server action for a function a \"use server\" directive names", () => {
    const actions = codeOf("\"use server\"", "export async function createUser(formData) {", "  await db.user.create(formData)", "}")
    const node = nodeViewNamed({ "app/actions.ts": actions }, { "app/actions.ts": [rangeAt(3, 3, 3, 33)] }, "createUser")

    expect(node?.typeLabel).toBe("Server action")
    expect(groupsOf(node)).toStrictEqual([[null, 1, []]])
  })
})

describe("the row groups of a tRPC router card", () => {
  it("reads Router, lists no row and groups its procedures by type, each named after its key", () => {
    const trpc = codeOf("import { initTRPC } from \"@trpc/server\"", "const t = initTRPC.create()", "export const router = t.router", "export const publicProcedure = t.procedure")
    const todo = codeOf(
      "import { router, publicProcedure } from \"./trpc\"",
      "export const todoRouter = router({",
      "  list: publicProcedure.query(() => findTodos()),",
      "  add: publicProcedure.mutation(() => addTodo()),",
      "})",
    )
    const node = nodeViewNamed({ "server/trpc.ts": trpc, "server/todo.ts": todo }, { "server/todo.ts": [rangeAt(3, 37, 3, 48), rangeAt(4, 39, 4, 48)] }, "todoRouter")

    expect(node?.typeLabel).toBe("Router")
    expect(node?.blockLists).toStrictEqual([])
    expect(groupsOf(node)).toStrictEqual([["Query", 0, ["list"]], ["Mutation", 0, ["add"]]])
  })
})

describe("the row groups of a state card", () => {
  it("groups the rows of a Zustand store under State, Actions and Selectors", () => {
    const store = codeOf(
      "import { create } from \"zustand\"",
      "export const useCartStore = create((set) => ({",
      "  items: [],",
      "  clear: () => set({ items: [] }),",
      "}))",
      "export const selectCount = (state) => state.items.length",
    )
    const total = codeOf("import { useCartStore, selectCount } from \"./store\"", "export const Count = () => {", "  const count = useCartStore(selectCount)", "  return <b>{count}</b>", "}")
    const node = nodeViewNamed({ "src/store.ts": store, "src/count.tsx": total }, { "src/store.ts": [rangeAt(3, 3, 3, 12), rangeAt(4, 16, 4, 33), rangeAt(6, 37, 6, 56)] }, "useCartStore")

    expect(groupsOf(node)).toStrictEqual([["State", 1, []], ["Actions", 1, []], ["Selectors", 1, []]])
  })

  it("groups the cards inside a Redux slice under their headings, after its state", () => {
    const slice = codeOf(
      "import { createSlice } from \"@reduxjs/toolkit\"",
      "export const cartSlice = createSlice({",
      "  name: \"cart\",",
      "  initialState: { items: [] },",
      "  reducers: {",
      "    clear: (state) => { state.items.splice(0) },",
      "  },",
      "})",
      "export const selectItems = (state) => state.cart.items",
    )
    const node = nodeViewNamed({ "src/slice.ts": slice }, { "src/slice.ts": [rangeAt(4, 19, 4, 28), rangeAt(6, 25, 6, 46), rangeAt(9, 43, 9, 54)] }, "cartSlice")

    expect(groupsOf(node)).toStrictEqual([["State", 1, []], ["Reducers", 0, ["clear"]], ["Selectors", 0, ["selectItems"]]])
  })

  it("reads API for an RTK Query API and groups its endpoints by type", () => {
    const api = codeOf(
      "import { createApi } from \"@reduxjs/toolkit/query/react\"",
      "export const todosApi = createApi({",
      "  endpoints: (builder) => ({",
      "    getTodos: builder.query({ query: () => listPath() }),",
      "    addTodo: builder.mutation({ query: (todo) => postOf(todo) }),",
      "  }),",
      "})",
    )
    const node = nodeViewNamed({ "src/api.ts": api }, { "src/api.ts": [rangeAt(4, 41, 4, 51), rangeAt(5, 50, 5, 62)] }, "todosApi")

    expect(node?.typeLabel).toBe("API")
    expect(groupsOf(node)).toStrictEqual([["Query", 0, ["getTodos"]], ["Mutation", 0, ["addTodo"]]])
  })
})

describe("the row groups of a Nest route card", () => {
  it("groups the methods of a controller by method, and lists no row for what a decorator hands the method", () => {
    const controller = codeOf(
      "import { Controller, Get, Post, Body, UseInterceptors } from \"@nestjs/common\"",
      "import { LoggingInterceptor } from \"./logging\"",
      "@Controller(\"users\")",
      "export class UsersController {",
      "  @UseInterceptors(LoggingInterceptor)",
      "  @Get()",
      "  list() {",
      "    return find()",
      "  }",
      "  @Post()",
      "  create(@Body() body) {",
      "    return save(body)",
      "  }",
      "}",
    )
    const files = { "src/users.ts": controller, "src/logging.ts": codeOf("export class LoggingInterceptor {}") }
    const node = nodeViewNamed(files, { "src/users.ts": [rangeAt(8, 5, 8, 18), rangeAt(12, 5, 12, 22)] }, "/users")

    expect(node?.typeLabel).toBe("Route")
    expect(groupsOf(node)).toStrictEqual([["POST", 0, ["UsersController.create"]], ["GET", 0, ["UsersController.list"]]])
    expect(node?.children.find((child) => child.name === "UsersController.list")?.blockLists).toStrictEqual([])
  })

  it("puts a heading that names a version after the heading of its method alone, versions in order", () => {
    const controller = codeOf(
      "import { Controller, Get, Post, Version } from \"@nestjs/common\"",
      "@Controller(\"users\")",
      "export class UsersController {",
      "  @Version(\"2\")",
      "  @Get()",
      "  listAgain() {",
      "    return find()",
      "  }",
      "  @Version(VERSION_NEUTRAL)",
      "  @Get()",
      "  list() {",
      "    return find()",
      "  }",
      "  @Post()",
      "  create() {",
      "    return save()",
      "  }",
      "}",
    )
    const main = codeOf("import { NestFactory } from \"@nestjs/core\"", "const app = await NestFactory.create(AppModule)", "app.enableVersioning({ type: VersioningType.HEADER, header: \"X-Version\", defaultVersion: \"1\" })")
    const node = nodeViewNamed({ "src/users.ts": controller, "src/main.ts": main }, { "src/users.ts": [rangeAt(7, 5, 7, 18), rangeAt(12, 5, 12, 18), rangeAt(16, 5, 16, 18)] }, "/users")

    expect(groupsOf(node)).toStrictEqual([["POST v1", 0, ["UsersController.create"]], ["GET", 0, ["UsersController.list"]], ["GET v2", 0, ["UsersController.listAgain"]]])
  })
})

describe("the row groups of a Nest controller card", () => {
  it("types the controller Controller, with what it is injected with under Properties and a method that is no route under Methods", () => {
    const controller = codeOf(
      "import { Controller, Get } from \"@nestjs/common\"",
      "@Controller(\"users\")",
      "export class UsersController {",
      "  constructor(private readonly usersService: UsersService) {}",
      "  @Get()",
      "  list() {",
      "    return this.usersService.find()",
      "  }",
      "  audit() {",
      "    return log()",
      "  }",
      "}",
    )
    const node = nodeViewNamed({ "src/users.ts": controller }, { "src/users.ts": [rangeAt(4, 15, 4, 59), rangeAt(10, 5, 10, 17)] }, "UsersController")

    expect(node?.typeLabel).toBe("Controller")
    expect(groupsOf(node)).toStrictEqual([["Properties", 1, []], ["Methods", 0, ["UsersController.audit"]]])
  })
})

describe("the row groups of a Nest resolver card", () => {
  it("types the resolver Resolver, its fields under their headings and a method that is no field under Methods", () => {
    const resolver = codeOf(
      "import { Query, ResolveField, Resolver } from \"@nestjs/graphql\"",
      "@Resolver()",
      "export class UsersResolver {",
      "  @Query(() => [User])",
      "  users() {",
      "    return this.find()",
      "  }",
      "  @ResolveField()",
      "  posts() {",
      "    return []",
      "  }",
      "  find() {",
      "    return load()",
      "  }",
      "}",
    )
    const node = nodeViewNamed({ "src/users.ts": resolver }, { "src/users.ts": [rangeAt(6, 5, 6, 23), rangeAt(10, 5, 10, 14), rangeAt(13, 5, 13, 18)] }, "UsersResolver")

    expect(node?.typeLabel).toBe("Resolver")
    expect(groupsOf(node)).toStrictEqual([["Query", 0, ["UsersResolver.users"]], ["Field", 0, ["UsersResolver.posts"]], ["Methods", 0, ["UsersResolver.find"]]])
  })
})
