# State card: Valtio

The [state card](../state.md) of a Valtio store. The rules every state card shares are on that page.

## One card per store

**A Valtio store is one card, with nothing inside it but rows.** The store is the value `proxy({…})` is kept in. Each key of the object is one row, under a heading:

```
STATE · ACTIONS
```

| Part | Row |
|---|---|
| A key holding a value, such as `items: []` | A row under STATE |
| A key holding a function, such as `addItem: (product) => { … }` | A row under ACTIONS |

```ts
export const cart = proxy({
  items: [],
  addItem: (product) => { cart.items.push(product) },
})
```
