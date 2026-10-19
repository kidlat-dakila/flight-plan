# State card: Effector

The [state card](../state.md) of an Effector store. The rules every state card shares are on that page.

## A store holds its cases

**An Effector store is one card that holds a card for each of its cases.** The store is every `createStore(…)` at the root of a file. The keys of an initial value written as an object are rows, and each `.on(trigger, reducer)` is a [function card](../function-card.md) inside the store card, named after its trigger:

```
STATE · CASES
```

| Part | Where it is drawn |
|---|---|
| A key of the initial value, such as `items: []` in `createStore({ items: [] })` | A row under STATE |
| `.on(addItem, (cart, product) => …)` chained on the store | A function card under CASES, named `addItem` |
| `$cart.on(reset, …)` written in another statement or another file | The same, in the card of the store it is called on |

```ts
export const addItem = createEvent()
export const $cart = createStore([]).on(addItem, (items, product) => [...items, product])
```
