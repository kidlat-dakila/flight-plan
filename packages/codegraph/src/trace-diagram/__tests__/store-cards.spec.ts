import { codeOf, rangeAt } from "@/code-blocks/__tests__/group-fixture"
import { nameOfBlock } from "@/trace/names"
import { listTraceNodes } from "@/trace-diagram"
import type { TraceDiagram, TraceNode } from "@flightplan/configurations"
import { outlineOfNodes, presentDiagramOf } from "./diagram-fixture"

const ZUSTAND_STORE = codeOf(
  "import { create } from \"zustand\"",
  "import { persist } from \"zustand/middleware\"",
  "export const useCartStore = create(persist((set, get) => ({",
  "  items: [],",
  "  total: 0,",
  "  addItem: (product) => set((state) => ({ items: [...state.items, product] })),",
  "  checkout: async () => {",
  "    await api.post(\"/orders\", get().items)",
  "    set({ items: [] })",
  "  },",
  "}), { name: \"cart\" }))",
  "export const selectTotal = (state) => state.items.reduce((sum, item) => sum + item.price, 0)",
)

const ZUSTAND_FILES = {
  "store/cart.ts": ZUSTAND_STORE,
  "ui/total.tsx": codeOf("import { useCartStore, selectTotal } from \"../store/cart\"", "export const Total = () => {", "  const total = useCartStore(selectTotal)", "  return <b>{total}</b>", "}"),
}

const PINIA_STORE = codeOf(
  "import { defineStore } from \"pinia\"",
  "import { ref, computed } from \"vue\"",
  "export const useCartStore = defineStore(\"cart\", {",
  "  state: () => ({ items: [], total: 0 }),",
  "  getters: {",
  "    count: (state) => state.items.length,",
  "  },",
  "  actions: {",
  "    addItem(product) { this.items.push(product) },",
  "    async checkout() {",
  "      await api.post(\"/orders\", this.items)",
  "      this.items = []",
  "    },",
  "  },",
  "})",
  "export const useWishlistStore = defineStore(\"wishlist\", () => {",
  "  const items = ref([])",
  "  const count = computed(() => items.value.length)",
  "  function add(product) { items.value.push(product) }",
  "  return { items, count, add }",
  "})",
)

const PINIA_FILES = {
  "stores/cart.ts": PINIA_STORE,
  "ui/cart.tsx": codeOf(
    "import { useCartStore, useWishlistStore } from \"../stores/cart\"",
    "export const Cart = () => {",
    "  const cart = useCartStore()",
    "  const wishlist = useWishlistStore()",
    "  return <button onClick={() => wishlist.add(cart.items[0])} />",
    "}",
  ),
}

const SLICE = codeOf(
  "import { createSlice, createAsyncThunk, createSelector, configureStore, createListenerMiddleware } from \"@reduxjs/toolkit\"",
  "export const checkout = createAsyncThunk(\"cart/checkout\", async (items) => api.post(\"/orders\", items))",
  "const cartSlice = createSlice({",
  "  name: \"cart\",",
  "  initialState: { items: [], status: \"idle\" },",
  "  reducers: {",
  "    addItem(state, action) { state.items.push(action.payload) },",
  "    clear: (state) => { state.items = [] },",
  "  },",
  "  extraReducers: (builder) => {",
  "    builder.addCase(checkout.fulfilled, (state) => { state.items.splice(0) })",
  "  },",
  "})",
  "const listenerMiddleware = createListenerMiddleware()",
  "listenerMiddleware.startListening({ actionCreator: cartSlice.actions.addItem, effect: () => storage.save() })",
  "export const selectItems = (state) => state.cart.items",
  "export const selectTotal = createSelector([selectItems], (items) => items.reduce((sum, item) => sum + item.price, 0))",
  "export const store = configureStore({ reducer: { cart: cartSlice.reducer } })",
)

const COUNTER = codeOf(
  "import { createAction, createReducer } from \"@reduxjs/toolkit\"",
  "export const increment = createAction(\"counter/increment\")",
  "export const counterReducer = createReducer({ value: 0 }, (builder) => {",
  "  builder.addCase(increment, (state) => { bump(state) })",
  "})",
)

const API = codeOf(
  "import { createApi, fetchBaseQuery } from \"@reduxjs/toolkit/query/react\"",
  "export const todosApi = createApi({",
  "  baseQuery: fetchBaseQuery({ baseUrl: \"/api\" }),",
  "  endpoints: (builder) => ({",
  "    getTodos: builder.query({ query: () => listPath() }),",
  "    updateTodo: builder.mutation({ query: (todo) => patchOf(todo) }),",
  "  }),",
  "})",
)

const MORE_API = codeOf(
  "import { todosApi } from \"./todos-api\"",
  "export const moreApi = todosApi.injectEndpoints({ endpoints: (build) => ({ getDone: build.query({ query: () => donePath() }) }) })",
)

const nodeNamed = (diagram: TraceDiagram, name: string): TraceNode | undefined =>
  listTraceNodes(diagram.traceNodes).find((node) => nameOfBlock(node.codeBlocks[0]) === name)

const rowNamesOf = (node: TraceNode | undefined): string[] => (node?.blockLabels ?? []).map(({ codeBlock }) => nameOfBlock(codeBlock))

describe("the card of a Zustand store", () => {
  it("is one node, with its state, its actions and a selector handed to its hook as rows", () => {
    const diagram = presentDiagramOf(ZUSTAND_FILES, { "store/cart.ts": [rangeAt(4, 3, 4, 12), rangeAt(9, 5, 9, 23), rangeAt(12, 37, 12, 90)] })
    const store = nodeNamed(diagram, "useCartStore")

    expect(outlineOfNodes(diagram).filter((line) => line.includes("useCartStore") || line.includes("selectTotal") || line.includes("checkout"))).toStrictEqual(["state useCartStore (changed)"])
    expect(rowNamesOf(store)).toStrictEqual(["items", "checkout", "selectTotal"])
  })
})

describe("the card of a Pinia store", () => {
  it("lists the state, the getters and the actions of a store written with options as rows", () => {
    const diagram = presentDiagramOf(PINIA_FILES, { "stores/cart.ts": [rangeAt(4, 19, 4, 29), rangeAt(6, 22, 6, 41), rangeAt(12, 7, 12, 22)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["state useCartStore (changed)", "component Cart", "render-event onClick"])
    expect(rowNamesOf(nodeNamed(diagram, "useCartStore"))).toStrictEqual(["items", "count", "checkout"])
  })

  it("lists the refs, the computed values and the functions of a setup store as rows", () => {
    const diagram = presentDiagramOf(PINIA_FILES, { "stores/cart.ts": [rangeAt(17, 3, 17, 23), rangeAt(19, 27, 19, 52)] })

    expect(rowNamesOf(nodeNamed(diagram, "useWishlistStore"))).toStrictEqual(["items", "count", "add"])
  })
})

describe("the card of a Redux slice", () => {
  it("holds its reducers, the thunk it handles, its extra reducers, its listeners and its selectors as cards inside it", () => {
    const diagram = presentDiagramOf({ "store/cart-slice.ts": SLICE }, {
      "store/cart-slice.ts": [rangeAt(2, 75, 2, 101), rangeAt(7, 30, 7, 61), rangeAt(11, 55, 11, 75), rangeAt(15, 87, 15, 101), rangeAt(16, 40, 16, 54), rangeAt(17, 72, 17, 116)],
    })

    expect(outlineOfNodes(diagram)).toStrictEqual([
      "state cartSlice",
      "  function selectItems (changed)",
      "  derived selectTotal (changed)",
      "  root-variable checkout (changed)",
      "  function addItem (changed)",
      "  code-event addItem listener (changed)",
      "  effect-callback checkout.fulfilled (changed)",
    ])
  })

  it("gives a write to the state a row of the reducer that writes it", () => {
    const diagram = presentDiagramOf({ "store/cart-slice.ts": SLICE }, { "store/cart-slice.ts": [rangeAt(8, 25, 8, 41)] })

    expect(rowNamesOf(nodeNamed(diagram, "clear"))).toStrictEqual(["state.items"])
  })

  it("lists the keys of its initial state as rows", () => {
    const diagram = presentDiagramOf({ "store/cart-slice.ts": SLICE }, { "store/cart-slice.ts": [rangeAt(5, 19, 5, 28), rangeAt(7, 30, 7, 61)] })

    expect(rowNamesOf(nodeNamed(diagram, "cartSlice"))).toStrictEqual(["items"])
  })

  it("gives configureStore, which only joins slices, no node", () => {
    const diagram = presentDiagramOf({ "store/cart-slice.ts": SLICE }, { "store/cart-slice.ts": [rangeAt(18, 39, 18, 71), rangeAt(7, 30, 7, 61)] })

    expect(listTraceNodes(diagram.traceNodes).map((node) => nameOfBlock(node.codeBlocks[0]))).not.toContain("store")
  })

  it("holds each case of createReducer as a card inside it, named after its action", () => {
    const diagram = presentDiagramOf({ "store/counter.ts": COUNTER }, { "store/counter.ts": [rangeAt(4, 43, 4, 54)] })

    expect(outlineOfNodes(diagram)).toStrictEqual(["state counterReducer", "  effect-callback increment (changed)"])
  })
})

describe("the card of an RTK Query API", () => {
  it("holds its endpoints as cards inside it, and the endpoints injected into it from another file", () => {
    const diagram = presentDiagramOf({ "store/todos-api.ts": API, "store/more-api.ts": MORE_API }, {
      "store/todos-api.ts": [rangeAt(5, 41, 5, 51), rangeAt(6, 51, 6, 63)],
      "store/more-api.ts": [rangeAt(2, 104, 2, 114)],
    })

    expect(outlineOfNodes(diagram)).toStrictEqual([
      "state todosApi",
      "  property getDone (changed)",
      "  property getTodos (changed)",
      "  property updateTodo (changed)",
    ])
  })
})

describe("a hook RTK Query makes for an endpoint", () => {
  it("draws the line from the component that calls it to the card of its endpoint, not to the head of the API", () => {
    const api = codeOf(
      "import { createApi } from \"@reduxjs/toolkit/query/react\"",
      "export const todosApi = createApi({",
      "  endpoints: (builder) => ({",
      "    getTodos: builder.query({ query: () => listPath() }),",
      "    addTodo: builder.mutation({ query: (todo) => postOf(todo) }),",
      "  }),",
      "})",
      "export const { useGetTodosQuery, useAddTodoMutation } = todosApi",
    )
    const list = codeOf("import { useAddTodoMutation } from \"./api\"", "export const List = () => {", "  const [add] = useAddTodoMutation()", "  return <ul onClick={() => add(1)} />", "}")
    const edgeIds = presentDiagramOf({ "src/api.ts": api, "src/list.tsx": list }, { "src/api.ts": [rangeAt(5, 50, 5, 62)] }).traceNodeEdges.map((edge) => edge.id)

    expect(edgeIds).toContain("src/list.tsx#component@2:1 -> src/api.ts#property@5:5")
    expect(edgeIds).not.toContain("src/list.tsx#component@2:1 -> src/api.ts#state@2:1")
  })
})

const MOBX_STORE = codeOf(
  "import { makeAutoObservable } from \"mobx\"",
  "export class CartStore {",
  "  items = []",
  "  constructor() {",
  "    makeAutoObservable(this)",
  "  }",
  "  get count() {",
  "    return this.items.length",
  "  }",
  "  addItem(product) {",
  "    this.items.push(product)",
  "  }",
  "}",
)

const VALTIO_STORE = codeOf(
  "import { proxy } from \"valtio\"",
  "export const cart = proxy({",
  "  items: [],",
  "  addItem: (product) => { cart.items.push(product) },",
  "})",
)

const MOBX_FILES = {
  "stores/cart.ts": MOBX_STORE,
  "ui/add-button.tsx": codeOf("import { CartStore } from \"../stores/cart\"", "const store = new CartStore()", "export const AddButton = () => <button onClick={() => store.addItem(1)} />"),
}

const VALTIO_FILES = {
  "stores/cart.ts": VALTIO_STORE,
  "ui/add-button.tsx": codeOf("import { cart } from \"../stores/cart\"", "export const AddButton = () => <button onClick={() => cart.addItem(1)} />"),
}

const EFFECTOR_STORE = codeOf(
  "import { createEvent, createStore } from \"effector\"",
  "export const addItem = createEvent()",
  "export const $cart = createStore([]).on(addItem, (items, product) => [...items, product])",
)

describe("the card of a MobX, a Valtio, an XState Store or a Nano Stores store", () => {
  it("is one node, with its state, its getters and its actions as rows", () => {
    const mobx = presentDiagramOf(MOBX_FILES, { "stores/cart.ts": [rangeAt(11, 5, 11, 29)] })
    const valtio = presentDiagramOf(VALTIO_FILES, { "stores/cart.ts": [rangeAt(4, 26, 4, 50)] })

    expect(outlineOfNodes(mobx).filter((line) => line.includes("CartStore") || line.includes("addItem"))).toHaveLength(1)
    expect(rowNamesOf(nodeNamed(mobx, "CartStore"))).toContain("CartStore.addItem")
    expect(outlineOfNodes(valtio).filter((line) => line.includes("cart") || line.includes("addItem"))).toHaveLength(1)
    expect(rowNamesOf(nodeNamed(valtio, "cart"))).toContain("addItem")
  })
})

describe("the card of an Effector store", () => {
  it("holds the cases of its .on as cards inside it", () => {
    const diagram = presentDiagramOf({ "stores/cart.ts": EFFECTOR_STORE }, { "stores/cart.ts": [rangeAt(3, 60, 3, 87)] })
    const store = nodeNamed(diagram, "$cart")

    expect(store?.children.length ?? 0).toBeGreaterThan(0)
  })
})
