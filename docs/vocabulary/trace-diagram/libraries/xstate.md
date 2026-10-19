# State card: XState Store

The [state card](../state.md) of an XState Store. The rules every state card shares are on that page.

## One card per store

**A store `createStore` of `@xstate/store` makes is one card, with nothing inside it but rows.** The store is the value `createStore` is kept in. Each key of its `context` and each transition under its `on` is one row, under a heading:

```
STATE · ACTIONS
```

| Part | Row |
|---|---|
| A key of `context`, such as `count: 0` | A row under STATE |
| A transition under `on`, such as `inc: (context) => ({ count: context.count + 1 })` | A row under ACTIONS |

**A machine is no store.** `createMachine` and `createActor` describe the logic of an actor, not a container of state and actions, so they make no card of their own.

```ts
export const counter = createStore({
  context: { count: 0 },
  on: {
    inc: (context) => ({ count: context.count + 1 }),
  },
})
```
