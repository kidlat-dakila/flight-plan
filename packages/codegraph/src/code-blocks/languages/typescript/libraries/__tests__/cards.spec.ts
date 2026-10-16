import { codeOf } from "@/code-blocks/__tests__/group-fixture"
import { cardsOf } from "@/code-blocks/libraries/__tests__/card-fixture"

describe("the cards Express writes", () => {
  it("makes each registration a holder of the route path, its last function the handler and those before it middleware, under its method", () => {
    expect(cardsOf({
      "server/routes.ts": codeOf(
        "import express from \"express\"",
        "const router = express.Router()",
        "router.post(\"/api/users\", requireSession, async (req, res) => { await save(req.body) })",
        "router.route(\"/api/items\").get((req, res) => res.json([]))",
      ),
    })).toStrictEqual([
      "route: Express route holder under POST at /api/users",
      "1: Express route middleware under POST at /api/users",
      "(req, res) => …: Express route handler under POST at /api/users",
      "route: Express route holder under GET at /api/items",
      "(req, res) => …: Express route handler under GET at /api/items",
    ])
  })

  it("gives a handler named from another file the card of the registration that names it", () => {
    expect(cardsOf({
      "server/routes.ts": codeOf("import express from \"express\"", "import { listUsers } from \"./list\"", "const router = express.Router()", "router.get(\"/api/users\", listUsers)"),
      "server/list.ts": codeOf("export const listUsers = async (req, res) => {", "  res.json(await findUsers())", "}"),
    })).toContain("listUsers: Express route handler under GET at /api/users in route")
  })
})

describe("the cards Fastify writes", () => {
  it("makes the handler and the preHandler of a route its handler and its middleware", () => {
    expect(cardsOf({
      "server/app.ts": codeOf(
        "import Fastify from \"fastify\"",
        "const app = Fastify()",
        "app.route({ method: \"PATCH\", url: \"/api/users\", preHandler: async (request) => check(request), handler: async (request) => save(request.body) })",
      ),
    })).toStrictEqual([
      "route: Fastify route holder under PATCH at /api/users",
      "(request) => …: Fastify route middleware under PATCH at /api/users",
      "(request) => …: Fastify route handler under PATCH at /api/users",
    ])
  })
})

describe("the cards tRPC writes", () => {
  it("makes a value that holds procedures a router, each procedure a part under its type, and a procedure that adds a use a base", () => {
    expect(cardsOf({
      "server/trpc.ts": codeOf("import { initTRPC } from \"@trpc/server\"", "const t = initTRPC.create()", "export const router = t.router", "export const authed = t.procedure.use(isAuthed)"),
      "server/todo.ts": codeOf(
        "import { router, authed } from \"./trpc\"",
        "export const todoRouter = router({",
        "  list: authed.query(() => findTodos()),",
        "  add: authed.mutation(() => addTodo()),",
        "  added: authed.subscription(async function* () { yield* watch() }),",
        "})",
        "export const appRouter = router({ todo: todoRouter })",
      ),
    })).toStrictEqual([
      "authed: tRPC router middleware",
      "todoRouter: tRPC router holder",
      "resolver: tRPC router procedure under QUERY",
      "resolver: tRPC router procedure under MUTATION",
      "resolver: tRPC router procedure under SUBSCRIPTION",
      "appRouter: tRPC router holder",
    ])
  })
})

describe("the cards Zustand writes", () => {
  it("makes the value of create the store, its values its state and its functions its actions, through persist", () => {
    expect(cardsOf({
      "store/cart.ts": codeOf(
        "import { create } from \"zustand\"",
        "import { persist } from \"zustand/middleware\"",
        "export const useCartStore = create(persist((set) => ({",
        "  items: [],",
        "  clear: () => set({ items: [] }),",
        "}), { name: \"cart\" }))",
        "export const selectCount = (state) => state.items.length",
      ),
      "ui/count.tsx": codeOf("import { useCartStore, selectCount } from \"../store/cart\"", "export const Count = () => {", "  const count = useCartStore(selectCount)", "  return <b>{count}</b>", "}"),
    })).toStrictEqual([
      "useCartStore: Zustand store holder",
      "items: Zustand store state under STATE",
      "clear: Zustand store action under ACTIONS",
      "selectCount: Zustand store selector under SELECTORS in useCartStore",
    ])
  })
})

describe("the cards Zustand leaves out", () => {
  it("makes nothing of a component that calls a store with a selector written in place", () => {
    expect(cardsOf({
      "store/cart.ts": codeOf("import { create } from \"zustand\"", "export const useCartStore = create((set) => ({ items: [] }))"),
      "ui/cart.tsx": codeOf("import { useCartStore } from \"../store/cart\"", "export const Cart = () => {", "  const items = useCartStore((state) => state.items)", "  return <ul>{items}</ul>", "}"),
    })).toStrictEqual(["useCartStore: Zustand store holder", "items: Zustand store state under STATE"])
  })
})

describe("the cards Zustand writes through devtools", () => {
  it("reads the store through devtools as through persist", () => {
    expect(cardsOf({
      "store/bears.ts": codeOf(
        "import { create } from \"zustand\"",
        "import { devtools } from \"zustand/middleware\"",
        "export const useBearStore = create(devtools((set) => ({ bears: 0, addBear: () => set((state) => ({ bears: state.bears + 1 })) })))",
      ),
    })).toStrictEqual(["useBearStore: Zustand store holder", "bears: Zustand store state under STATE", "addBear: Zustand store action under ACTIONS"])
  })
})

describe("the cards Pinia writes", () => {
  it("makes the state, the getters and the actions of an options store and of a setup store its parts", () => {
    expect(cardsOf({
      "stores/cart.ts": codeOf(
        "import { defineStore } from \"pinia\"",
        "import { ref, computed } from \"vue\"",
        "export const useCartStore = defineStore(\"cart\", {",
        "  state: () => ({ items: [] }),",
        "  getters: { count: (state) => state.items.length },",
        "  actions: { clear() { this.items = [] } },",
        "})",
        "export const useWishlistStore = defineStore(\"wishlist\", () => {",
        "  const items = ref([])",
        "  const count = computed(() => items.value.length)",
        "  function add(product) { items.value.push(product) }",
        "  return { items, count, add }",
        "})",
      ),
    })).toStrictEqual([
      "useCartStore: Pinia store holder",
      "items: Pinia store state under STATE",
      "count: Pinia store getter under GETTERS",
      "clear: Pinia store action under ACTIONS",
      "useWishlistStore: Pinia store holder",
      "items: Pinia store state under STATE",
      "count: Pinia store getter under GETTERS",
      "add: Pinia store action under ACTIONS",
    ])
  })
})

describe("the cards Redux Toolkit writes", () => {
  it("makes a slice a store keyed by its name, and links the thunk, the listener and the selectors written beside it", () => {
    expect(cardsOf({
      "store/cart.ts": codeOf(
        "import { createSlice, createAsyncThunk, createSelector, configureStore, createListenerMiddleware } from \"@reduxjs/toolkit\"",
        "export const checkout = createAsyncThunk(\"cart/checkout\", async (items) => post(items))",
        "const cartSlice = createSlice({",
        "  name: \"cart\",",
        "  initialState: { items: [] },",
        "  reducers: { clear: (state) => { state.items = [] } },",
        "  extraReducers: (builder) => { builder.addCase(checkout.fulfilled, (state) => { state.items.splice(0) }) },",
        "})",
        "const listener = createListenerMiddleware()",
        "listener.startListening({ actionCreator: cartSlice.actions.clear, effect: () => save() })",
        "export const selectItems = (state) => state.cart.items",
        "export const selectCount = createSelector([selectItems], (items) => items.length)",
        "export const store = configureStore({ reducer: { cart: cartSlice.reducer } })",
      ),
    })).toStrictEqual([
      "checkout: Redux store thunk under THUNKS in cartSlice",
      "cartSlice: Redux store holder at cart",
      "items: Redux store state under STATE",
      "clear: Redux store reducer under REDUCERS",
      "checkout.fulfilled: Redux store extra-reducer under EXTRA REDUCERS",
      "clear listener: Redux store listener under LISTENERS in cartSlice",
      "selectItems: Redux store selector under SELECTORS in cartSlice",
      "selectCount: Redux store selector under SELECTORS in cartSlice",
      "store: Redux store holder",
    ])
  })

  it("makes the state of an entity adapter one state of the slice, a reducer it gives a reducer, and a selector it gives a selector of the slice it reads", () => {
    expect(cardsOf({
      "store/todos.ts": codeOf(
        "import { createEntityAdapter, createSlice } from \"@reduxjs/toolkit\"",
        "const todosAdapter = createEntityAdapter()",
        "export const todosSlice = createSlice({",
        "  name: \"todos\",",
        "  initialState: todosAdapter.getInitialState({ filter: \"all\" }),",
        "  reducers: { todoAdded: todosAdapter.addOne },",
        "})",
        "export const { selectAll: selectAllTodos } = todosAdapter.getSelectors((state) => state.todos)",
      ),
    })).toStrictEqual([
      "todosSlice: Redux store holder at todos",
      "todosAdapter.getInitialState(): Redux store state under STATE",
      "filter: Redux store state under STATE",
      "todoAdded: Redux store reducer under REDUCERS",
      "selectAllTodos: Redux store selector under SELECTORS in todosSlice",
    ])
  })

  it("makes the initial state of createReducer its state and each addCase a case, named after its action", () => {
    expect(cardsOf({
      "store/counter.ts": codeOf(
        "import { createReducer } from \"@reduxjs/toolkit\"",
        "export const counterReducer = createReducer({ value: 0 }, (builder) => {",
        "  builder.addCase(increment, (state) => { state.value += 1 })",
        "})",
      ),
    })).toStrictEqual([
      "counterReducer: Redux store holder",
      "value: Redux store state under STATE",
      "increment: Redux store case under CASES",
    ])
  })
})

describe("the cards RTK Query writes", () => {
  it("makes the value of createApi an API, each endpoint a part under its type, and an injected endpoint a part of the API it is injected into", () => {
    expect(cardsOf({
      "store/api.ts": codeOf(
        "import { createApi } from \"@reduxjs/toolkit/query/react\"",
        "export const api = createApi({",
        "  endpoints: (build) => ({",
        "    getTodos: build.query({ query: () => \"todos\" }),",
        "    addTodo: build.mutation({ query: (todo) => ({ url: \"todos\", method: \"POST\", body: todo }) }),",
        "  }),",
        "})",
      ),
      "store/more.ts": codeOf("import { api } from \"./api\"", "export const moreApi = api.injectEndpoints({ endpoints: (build) => ({ getDone: build.query({ query: () => \"done\" }) }) })"),
    })).toStrictEqual([
      "api: RTK Query api holder",
      "getTodos: RTK Query api endpoint under QUERY",
      "addTodo: RTK Query api endpoint under MUTATION",
      "getDone: RTK Query api endpoint under QUERY in api",
    ])
  })
})
