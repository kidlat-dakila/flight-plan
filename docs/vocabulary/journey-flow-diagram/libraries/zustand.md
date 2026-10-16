# State card: Zustand

The [state card](../state.md) of a Zustand store. The rules every state card shares are on that page.

## One card per store

**A Zustand store is one card, with nothing inside it but rows.** The store is the value `create` or `createStore` is kept in, through any middleware around the function it is handed, such as `persist` or `devtools`. Its state, its actions and its selectors are each one row, under a heading:

```
STATE · ACTIONS · SELECTORS
```

| Part | Row |
|---|---|
| A value written under a key of what the function returns, such as `items: []` | A row under STATE, named after its key |
| A function written under a key of what the function returns, such as `addItem: (product) => set(…)` | A row under ACTIONS, named after its key |
| A selector beside the store, a function handed to the hook of the store, such as `selectTotal` in `useCartStore(selectTotal)` | A row under SELECTORS, in the store it is handed to |

**An action is a row, not a card.** A line to what an action calls leaves its row, and a changed line in it marks the row. A selector handed to two stores is a row of the first.

```ts
export const useCartStore = create(persist((set, get) => ({
  items: [],
  total: 0,
  addItem: (product) => set((state) => ({ items: [...state.items, product] })),
  checkout: async () => {
    await api.post("/orders", get().items)
    set({ items: [] })
  },
}), { name: "cart" }))

export const selectTotal = (state) => state.items.reduce((sum, item) => sum + item.price, 0)

// elsewhere
const total = useCartStore(selectTotal)
```

```
 ┌ ▤ useCartStore ─────────────────────────── store/cart.ts ┐
 │ State                                           Modified │
 │ The cart a shopper fills                                 │
 │ STATE                                                    │  ← keys of the state
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │ items                                                │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │ total                                                │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ ACTIONS                                                  │  ← each action: one row
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │ Puts a product in the cart                           │ │
 │ │ addItem                                              │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ ╔══════════════════════════════════════════════════════╗ │
 │ ║ Sends the cart as an order                           ║○──▶ api.post
 │ ║ checkout                                             ║ │
 │ ╚══════════════════════════════════════════════════════╝ │
 │ SELECTORS                                                │  ← handed to useCartStore: a row here
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │ Adds up the prices                                   │ │
 │ │ selectTotal                                          │ │
 │ └──────────────────────────────────────────────────────┘ │
 └──────────────────────────────────────────────────────────┘
```

`get().items` reads the store and has no row of its own. `set({ items: [] })` writes it, and the row of `checkout` holds it, as [Reading and writing the store](../state.md#reading-and-writing-the-store) says.
