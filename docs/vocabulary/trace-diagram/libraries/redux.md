# State card: Redux

The [state card](../state.md) of Redux and Redux Toolkit. The rules every state card shares are on that page.

## A slice

**A slice is one card, with what runs as inner [function cards](../function-card.md).** The slice is the value `createSlice` is kept in. Its state is rows, and its reducers, thunks, extra reducers, listeners and selectors are cards inside it, each in the `children` of the slice node:

```
STATE · REDUCERS · THUNKS · EXTRA REDUCERS · LISTENERS · SELECTORS
```

| Part | Drawn as |
|---|---|
| A key of `initialState` | A row under STATE, named after its key |
| A function under a key of `reducers` | A function card under REDUCERS, named after its key |
| A thunk, `createAsyncThunk`, that the slice's `extraReducers` handles | A function card under THUNKS. A thunk no slice handles is a card of its own. |
| A case of `extraReducers`, `builder.addCase(checkout.fulfilled, …)` | A function card under EXTRA REDUCERS, named after its action |
| The `effect` of `listenerMiddleware.startListening({ actionCreator, effect })` that listens to an action of the slice | A function card under LISTENERS. A listener of an action no slice makes is a card of its own. |
| A selector beside the slice, a function that reads the key of the slice, such as `(state) => state.cart.items`, and a `createSelector` built on one | A function card under SELECTORS, in the slice it reads |

**A write to the state in a reducer is a row of the reducer card.** `state.items.push(action.payload)` and `state.items = []` are rows, and reading `state.items` has none, as [Reading and writing the store](../state.md#reading-and-writing-the-store) says.

```ts
export const checkout = createAsyncThunk("cart/checkout", async (items) => api.post("/orders", items))

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [], status: "idle" },
  reducers: {
    addItem(state, action) { state.items.push(action.payload) },
    clear: (state) => { state.items = [] },
  },
  extraReducers: (builder) => {
    builder.addCase(checkout.fulfilled, (state) => { state.items = [] })
  },
})

listenerMiddleware.startListening({ actionCreator: cartSlice.actions.addItem, effect: () => storage.save() })

export const selectItems = (state) => state.cart.items
export const selectTotal = createSelector([selectItems], (items) => items.reduce((sum, item) => sum + item.price, 0))
export const store = configureStore({ reducer: { cart: cartSlice.reducer } })
```

```
 ┌ ▤ cartSlice ──────────────────────────── store/cart-slice.ts ┐
 │ State                                               Modified │
 │ The cart slice                                               │
 │ STATE                                                        │  ← keys of initialState: rows
 │ ┌──────────────────────────────────────────────────────────┐ │
 │ │ items                                                    │ │
 │ └──────────────────────────────────────────────────────────┘ │
 │ ┌──────────────────────────────────────────────────────────┐ │
 │ │ status                                                   │ │
 │ └──────────────────────────────────────────────────────────┘ │
 │ REDUCERS                                                     │
 │ ┌ ƒ addItem ────────────────────────── store/cart-slice.ts ┐ │  ← a reducer: an inner function card
 │ │ Function                                        Modified │ │
 │ │ Puts a product in the cart                               │ │
 │ │ ┌──────────────────────────────────────────────────────┐ │ │
 │ │ │ action                                               │ │ │
 │ │ └──────────────────────────────────────────────────────┘ │ │
 │ │ ╔══════════════════════════════════════════════════════╗ │ │
 │ │ ║ Adds the product                                     ║ │ │
 │ │ ║ state.items.push                                     ║ │ │
 │ │ ╚══════════════════════════════════════════════════════╝ │ │
 │ └──────────────────────────────────────────────────────────┘ │
 │ ┌ ƒ clear ──────────────────────────── store/cart-slice.ts ┐ │
 │ │ Function                                                 │ │
 │ │ Empties the cart                                         │ │
 │ │ ┌──────────────────────────────────────────────────────┐ │ │
 │ │ │ state.items                                          │ │ │
 │ │ └──────────────────────────────────────────────────────┘ │ │
 │ └──────────────────────────────────────────────────────────┘ │
 │ THUNKS                                                       │
 │ ┌ ƒ checkout ───────────────────────── store/cart-slice.ts ┐ │  ← handled by extraReducers: drawn here
 │ │ Variable                                                 │ │
 │ │ Sends the cart as an order                               │ │
 │ │ ┌──────────────────────────────────────────────────────┐ │ │
 │ │ │ api.post                                             │○──▶ api.post
 │ │ └──────────────────────────────────────────────────────┘ │ │
 │ └──────────────────────────────────────────────────────────┘ │
 │ EXTRA REDUCERS                                               │
 │ ┌ ƒ checkout.fulfilled ─────────────── store/cart-slice.ts ┐ │
 │ │ Callback                                                 │ │
 │ │ Empties the cart after an order                          │ │
 │ │ ┌──────────────────────────────────────────────────────┐ │ │
 │ │ │ state.items                                          │ │ │
 │ │ └──────────────────────────────────────────────────────┘ │ │
 │ └──────────────────────────────────────────────────────────┘ │
 │ LISTENERS                                                    │
 │ ┌ ƒ addItem listener ───────────────── store/cart-slice.ts ┐ │  ← listens to addItem
 │ │ Callback                                                 │ │
 │ │ Saves the cart after a product is added                  │ │
 │ │ ┌──────────────────────────────────────────────────────┐ │ │
 │ │ │ storage.save                                         │○──▶ storage.save
 │ │ └──────────────────────────────────────────────────────┘ │ │
 │ └──────────────────────────────────────────────────────────┘ │
 │ SELECTORS                                                    │
 │ ┌ ƒ selectItems ────────────────────── store/cart-slice.ts ┐ │  ← reads state.cart: drawn here
 │ │ Function                                                 │ │
 │ │ Reads the items                                          │ │
 │ │ ┌──────────────────────────────────────────────────────┐ │ │
 │ │ │ state                                                │ │ │
 │ │ └──────────────────────────────────────────────────────┘ │ │
 │ └──────────────────────────────────────────────────────────┘ │
 │ ┌ ƒ selectTotal ────────────────────── store/cart-slice.ts ┐ │
 │ │ Derived                                                  │ │
 │ │ Adds up the prices                                       │ │
 │ │ ┌──────────────────────────────────────────────────────┐ │ │
 │ │ │ selectItems                                          │○──▶ selectItems
 │ │ └──────────────────────────────────────────────────────┘ │ │
 │ └──────────────────────────────────────────────────────────┘ │
 └──────────────────────────────────────────────────────────────┘
```

`configureStore` only joins slices, so it has no card, as [Values that join stores](../state.md#values-that-join-stores) says.

## An entity adapter

**An entity adapter has no card.** What it gives a slice is drawn in the slice:

| Code | Drawn as |
|---|---|
| `initialState: todosAdapter.getInitialState({ filter: "all" })` | One STATE row for the adapter's state, and a row for each key handed to it, `filter` |
| `todoAdded: todosAdapter.addOne` | A reducer card, named after its key |
| `todosAdapter.getSelectors((state) => state.todos)` | A selector card for each selector taken from it, in the slice it reads |

```ts
const todosAdapter = createEntityAdapter()
const todosSlice = createSlice({
  name: "todos",
  initialState: todosAdapter.getInitialState({ filter: "all" }),
  reducers: {
    todoAdded: todosAdapter.addOne,
    filterChanged(state, action) { state.filter = action.payload },
  },
})
export const { selectAll: selectAllTodos } = todosAdapter.getSelectors((state) => state.todos)
```

```
 ┌ ▤ todosSlice ────────────────────── store/todos-slice.ts ┐
 │ State                                                    │
 │ The todos kept in the browser                            │
 │ STATE                                                    │
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │ todosAdapter.getInitialState()                       │ │  ← the adapter's state: one row
 │ └──────────────────────────────────────────────────────┘ │
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │ filter                                               │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ REDUCERS                                                 │
 │ ┌ ƒ todoAdded ─────────────────── store/todos-slice.ts ┐ │  ← todoAdded: todosAdapter.addOne
 │ │ Function                                             │ │
 │ │ Adds one todo                                        │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ ┌ ƒ filterChanged ─────────────── store/todos-slice.ts ┐ │
 │ │ Function                                    Modified │ │
 │ │ Changes the filter                                   │ │
 │ │ ┌──────────────────────────────────────────────────┐ │ │
 │ │ │ action                                           │ │ │
 │ │ └──────────────────────────────────────────────────┘ │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ SELECTORS                                                │
 │ ┌ ƒ selectAllTodos ────────────── store/todos-slice.ts ┐ │  ← from todosAdapter.getSelectors
 │ │ Function                                             │ │
 │ │ Reads every todo                                     │ │
 │ └──────────────────────────────────────────────────────┘ │
 └──────────────────────────────────────────────────────────┘
```

## createAction and createReducer

**`createAction` is a card of its own**, as [plain code](../../trace-diagram.md#plain-code) says of every value made by a call. **`createReducer` is a state card**, with the headings STATE · CASES: the keys of its initial state are rows, and each `addCase` is a function card under CASES, named after its action.

```ts
export const increment = createAction("counter/increment")
export const reset = createAction("counter/reset")
export const counterReducer = createReducer({ value: 0 }, (builder) => {
  builder
    .addCase(increment, (state) => { state.value += 1 })
    .addCase(reset, (state) => { state.value = 0 })
})
```

```
 ┌ ▤ counterReducer ────────────────────── store/counter.ts ┐
 │ State                                           Modified │
 │ The counter                                              │
 │ STATE                                                    │
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │ value                                                │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ CASES                                                    │  ← each builder.addCase
 │ ┌ ƒ increment ─────────────────────── store/counter.ts ┐ │  ← named after its action
 │ │ Callback                                    Modified │ │
 │ │ Adds one                                             │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ ┌ ƒ reset ─────────────────────────── store/counter.ts ┐ │
 │ │ Callback                                             │ │
 │ │ Goes back to zero                                    │ │
 │ └──────────────────────────────────────────────────────┘ │
 └──────────────────────────────────────────────────────────┘
```

## RTK Query

**An API of RTK Query is one card, drawn as a [tRPC router card](trpc.md) is.** The API is the value `createApi` is kept in. Its endpoints are grouped by type, QUERY then MUTATION, and each endpoint is a function card inside it, named after its key, from the function its `query` or its `queryFn` is.

| Code | Drawn as |
|---|---|
| `createApi({ endpoints: (builder) => ({ getTodos: builder.query(…) }) })` | An API card, with `getTodos` under QUERY |
| `todosApi.injectEndpoints({ endpoints: (builder) => ({ … }) })` | Its endpoints, inside the card of the API they are injected into |
| `useGetTodosQuery()` in a component | A hook row of the component, with a line to the card of `getTodos` |

```ts
export const todosApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  endpoints: (builder) => ({
    getTodos: builder.query({ query: () => "/todos" }),
    updateTodo: builder.mutation({
      query: (todo) => ({ url: `/todos/${todo.id}`, method: "PATCH", body: todo }),
    }),
  }),
})
export const { useGetTodosQuery, useUpdateTodoMutation } = todosApi
```

```
 ┌ ⇄ todosApi ────────────────────────── store/todos-api.ts ┐
 │ API                                             Modified │
 │ Reads and edits todos on the server                      │
 │ QUERY                                                    │  ← endpoint type heading
 │ ┌ ƒ getTodos ────────────────────── store/todos-api.ts ┐ │  ← an endpoint: an inner function card
 │ │ Endpoint                                             │ │
 │ │ Loads every todo                                     │ │
 │ │ ┌──────────────────────────────────────────────────┐ │ │
 │ │ │ GET /todos                                       │○──▶ GET /todos
 │ │ └──────────────────────────────────────────────────┘ │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ MUTATION                                                 │
 │ ┌ ƒ updateTodo ──────────────────── store/todos-api.ts ┐ │
 │ │ Endpoint                                    Modified │ │
 │ │ Saves an edited todo                                 │ │
 │ │ ┌──────────────────────────────────────────────────┐ │ │
 │ │ │ todo                                             │ │ │
 │ │ └──────────────────────────────────────────────────┘ │ │
 │ │ ╔══════════════════════════════════════════════════╗ │ │
 │ │ ║ Sends the edited todo                            ║○──▶ PATCH /todos/:id
 │ │ ║ PATCH /todos/:id                                 ║ │ │
 │ │ ╚══════════════════════════════════════════════════╝ │ │
 │ └──────────────────────────────────────────────────────┘ │
 └──────────────────────────────────────────────────────────┘
```
