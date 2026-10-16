# State card: Pinia

The [state card](../state.md) of a Pinia store. The rules every state card shares are on that page.

## One card per store

**A Pinia store is one card, with nothing inside it but rows.** The store is the value `defineStore` is kept in, written with options or as a setup function. Its state, its getters and its actions are each one row, under a heading:

```
STATE · GETTERS · ACTIONS
```

| Part | Options store | Setup store | Row |
|---|---|---|---|
| State | A key of what `state` returns | A `ref` or a `reactive` it returns | A row under STATE, named after its key |
| A getter | A key of `getters` | A `computed` it returns | A row under GETTERS, named after its key |
| An action | A key of `actions` | A function it returns | A row under ACTIONS, named after its key |

**A getter and an action are rows, not cards.** A line to what one calls leaves its row, and a changed line in it marks the row.

```ts
export const useCartStore = defineStore("cart", {
  state: () => ({ items: [], total: 0 }),
  getters: {
    count: (state) => state.items.length,
    isEmpty() { return this.items.length === 0 },
  },
  actions: {
    addItem(product) { this.items.push(product) },
    async checkout() {
      await api.post("/orders", this.items)
      this.items = []
    },
  },
})
```

```
 ┌ ▤ useCartStore ────────────────────────── stores/cart.ts ┐
 │ State                                           Modified │
 │ The cart a shopper fills                                 │
 │ STATE                                                    │
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │ items                                                │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │ total                                                │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ GETTERS                                                  │  ← each getter: one row
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │ Counts the items                                     │ │
 │ │ count                                                │ │
 │ └──────────────────────────────────────────────────────┘ │
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │ Says the cart is empty                               │ │
 │ │ isEmpty                                              │ │
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
 └──────────────────────────────────────────────────────────┘
```

A setup store is drawn the same way:

```ts
export const useWishlistStore = defineStore("wishlist", () => {
  const items = ref([])
  const count = computed(() => items.value.length)
  function add(product) { items.value.push(product) }
  return { items, count, add }
})
```

`items` is a row under STATE, `count` under GETTERS and `add` under ACTIONS.

`this.items` read in `isEmpty` has no row. `this.items.push(product)` and `this.items = []` write the store, and the rows of `addItem` and `checkout` hold them, as [Reading and writing the store](../state.md#reading-and-writing-the-store) says.
