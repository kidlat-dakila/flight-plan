# State card: MobX

The [state card](../state.md) of a MobX store. The rules every state card shares are on that page.

## One card per store

**A MobX store is one card, with nothing inside it but rows.** The store is a class whose constructor hands `this` to `makeAutoObservable` or `makeObservable`, or the value `observable({…})` or `makeAutoObservable({…})` is kept in. Its state, its getters and its actions are each one row, under a heading:

```
STATE · GETTERS · ACTIONS
```

| Part | Row |
|---|---|
| A field of the class, such as `items = []`, or a key of the object holding a value | A row under STATE |
| A `get` member of the class or the object, such as `get count()` | A row under GETTERS |
| A method, an arrow function field, or a key of the object holding a function | A row under ACTIONS |

**With `makeObservable(this, { … })`, only the members it annotates are parts.** A member annotated `observable` is state, `computed` a getter, and `action` or `flow` an action. A member the annotations set to `false`, and the constructor, are no part. `observable([])` makes no card.

```ts
export class CartStore {
  items = []
  constructor() {
    makeAutoObservable(this)
  }
  get count() {
    return this.items.length
  }
  addItem(product) {
    this.items.push(product)
  }
}
```

The card `CartStore` has `items` under STATE, `count` under GETTERS and `addItem` under ACTIONS. A method's row carries the name of its class, as every method does: `CartStore.addItem`.
