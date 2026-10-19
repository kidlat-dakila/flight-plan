# State card: Nano Stores

The [state card](../state.md) of a Nano Stores store. The rules every state card shares are on that page.

## One card per store

**A Nano Stores store is one card, with nothing inside it but rows.** The store is the value `map` or `atom` is kept in. Each key of the initial value of a `map` is one row, under a heading:

```
STATE
```

| Part | Row |
|---|---|
| A key of the value `map` is handed, such as `items: []` | A row under STATE |

**An atom is a card with no row.** Its value has no keys, and the docs of Nano Stores call it an atom store, so its card holds nothing but its name. The functions written beside a store to change it are no part of it.

```ts
export const $cart = map({ items: [], total: 0 })
export const $theme = atom("light")
```
