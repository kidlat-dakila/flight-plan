import { createSegment, createViewContext } from "@/__tests__/review-fixture"
import { codeOf, rangeAt, type FixtureDiffs, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import { buildJourney } from "@/journey/build"
import { presentDiagramOf } from "@/journey-flow-diagram/__tests__/diagram-fixture"
import type { JourneyNodeView } from "@flightplan/configurations"

const listNodeViews = (nodes: readonly JourneyNodeView[]): JourneyNodeView[] => nodes.flatMap((node) => [node, ...listNodeViews(node.children)])

const nodeViewNamed = (files: FixtureFiles, diffs: FixtureDiffs, name: string): JourneyNodeView | undefined => {
  const segment = createSegment({ journey: presentDiagramOf(files, diffs) })
  return listNodeViews(buildJourney(segment, "", [], createViewContext()).diagram?.nodes ?? []).find((node) => node.name === name)
}

const groupsOf = (node: JourneyNodeView | undefined): [string | null, number, string[]][] =>
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
