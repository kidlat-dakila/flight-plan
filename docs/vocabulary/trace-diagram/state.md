# State card

The card of a store in a [Trace Diagram](../trace-diagram.md): a value, made by a library, that keeps state for the code that reads and writes it. This page holds what every state library shares, and is where to start when a library is added. What one library writes and how its card looks is on the page of that library. The rules every card shares, its frame, its rows and its lines, are in [On the page](../trace-diagram.md#on-the-page).

| Library | Page | Shape |
|---|---|---|
| Zustand | [libraries/zustand.md](libraries/zustand.md) | Rows only |
| Pinia | [libraries/pinia.md](libraries/pinia.md) | Rows only |
| Redux, Redux Toolkit and RTK Query | [libraries/redux.md](libraries/redux.md) | Holding cards |
| MobX | [libraries/mobx.md](libraries/mobx.md) | Rows only |
| Valtio | [libraries/valtio.md](libraries/valtio.md) | Rows only |
| XState Store | [libraries/xstate.md](libraries/xstate.md) | Rows only |
| Nano Stores | [libraries/nanostores.md](libraries/nanostores.md) | Rows only |
| Effector | [libraries/effector.md](libraries/effector.md) | Holding cards |

## What is a state card

**A store is one node, of the type `state`.** A library declares a store with a call, such as `create`, `defineStore`, `createSlice`, `proxy` or `createStore`, or with a class that hands itself to `makeAutoObservable`, and the value at the top level of a file that keeps the result of that call is the store: its **holder**. The holder is the node. A store is never [plain](../trace-diagram.md#plain-code), since it is made by a call.

**Everything a store declares is a part of it.** A library declares the parts of a store in the arguments of the call that makes it, or beside it, and each part is one kind of the `part` of a block's `card`:

| Part | What it is | Heading |
|---|---|---|
| `holder` | The value the store is kept in | None: it is the card |
| `state` | A key of the state the store keeps | STATE |
| `getter` | A value the store derives from its state | GETTERS |
| `action` | A function that changes the state, called from outside | ACTIONS |
| `reducer` | A function that changes the state for one action | REDUCERS |
| `case` | A reducer written for an action made elsewhere | CASES |
| `thunk` | A function that runs before an action, such as one that loads data | THUNKS |
| `extra-reducer` | A reducer of the store for an action of another | EXTRA REDUCERS |
| `listener` | A function that runs after an action | LISTENERS |
| `selector` | A function beside the store that reads its state | SELECTORS |
| `endpoint` | A request an API of the store declares | QUERY, MUTATION |

A library uses the parts it has. Its page says which, under which name it writes them, and in which order its headings come.

## The shape of a card

**A library draws its store in one of two shapes.**

| Shape | What is in the card | Libraries |
|---|---|---|
| Rows only | Every part is a row under its heading. Nothing is a card inside it, and a line to what a part calls leaves its row. | [Zustand](libraries/zustand.md), [Pinia](libraries/pinia.md), [MobX](libraries/mobx.md), [Valtio](libraries/valtio.md), [XState Store](libraries/xstate.md), [Nano Stores](libraries/nanostores.md) |
| Holding cards | `state` is rows. Every other part is a [function card](function-card.md) inside the store card, under its heading, in the `children` of the store node. | [Redux](libraries/redux.md), Redux Toolkit, RTK Query, [Effector](libraries/effector.md) |

**STATE comes first, and a heading with nothing under it is left out.** A key of the state is a row named after the key, such as `items` of `{ items: [], total: 0 }`, in either shape.

## Parts written beside the store

**A part written outside the call that makes the store is drawn in the store it belongs to.** A selector is a function of its own file, a thunk a value of its own, a listener a call of its own. The block of such a part holds the store it belongs to as the `ownerId` of its `card`, found from the symbols that join them: the store a selector is handed to or reads, the store whose reducer handles a thunk, the store whose action a listener listens to. A part that belongs to no store of the diagram is a card of its own.

## Reading and writing the store

**Reading the store has no row. Writing it has one.**

| Code | Row |
|---|---|
| A read of the store from inside it, such as `this.items`, `state.items` or `get().items` | None. It reaches the store itself, as `this` reaches a class in a [class card](class-card.md#rows-and-methods). |
| A write of the store, such as `set({ items: [] })`, `this.items = []`, `this.items.push(product)` or `state.items = []` | A row wherever its code lists rows |

In a store of the shape rows only, the row of the part that writes holds the write, and a changed write marks that row as changed. In a store of the shape holding cards, a write is a row of the function card it is written in. A card outside the store that writes it, such as a component that calls `useCartStore.setState(…)`, has a row for the write.

## Values that join stores

**A value that only joins stores has no card.** A value that holds stores and runs nothing of its own, such as `configureStore({ reducer: { cart: cartSlice.reducer } })`, is no node, and each store it joins is a card of its own, as a [router that only joins routers](libraries/trpc.md#routers-joined-into-another) is.

## Adding a state library

A state library is added in the folders of its language, one file in each, and nothing outside them changes:

| What | Where | What it holds |
|---|---|---|
| The library file | `packages/codegraph/src/code-blocks/languages/<language>/libraries/<library>.ts`, listed in `TYPESCRIPT_LIBRARIES` or `PYTHON_LIBRARIES` of that folder's `index.ts` | A `Library`: its name, specifiers and documented version, the patterns of the calls that make a store and its parts, and a `readCards` for what a pattern cannot say. It writes the `card` of each block: the library, the kind `store`, the part, the heading and, for a part beside the store, the `ownerId`. A library already in the catalogue moves its entry here, and leaves the catalogue. |
| Its fixtures | `packages/codegraph/src/code-blocks/languages/<language>/libraries/__tests__/` | Code each pattern matches and code it rejects, and the `card` each block gets |
| The card file | `packages/codegraph/src/trace-diagram/languages/<language>/libraries/<library>.ts`, listed in `TYPESCRIPT_CARD_RULES` or `PYTHON_CARD_RULES` of `trace-diagram/languages/<language>/index.ts` | A `LibraryCardRules` that extends the shared `store` card: its shape, `ROWS_ONLY_STORE` of `trace-diagram/cards/store.ts` for rows only and no rules of its own for holding cards, and anything else its card does differently |
| The band | `STORE_HEADINGS` in `packages/codegraph/src/trace/cards/store.ts` | The one order of the headings every state library shares. A library uses the headings of its parts, read from the `heading` of each; a new heading is added there, in its place. |
| Its page | `docs/vocabulary/trace-diagram/libraries/<library>.md`, and a row in the table at the top of this page | The parts the library has and under which names it writes them, its headings in order, its shape, an example of its code and a drawing of its card |

**Start from the page of the closest library.** A library that keeps its parts as keys of one returned object or members of one class, as Zustand, Pinia, MobX and Valtio do, is drawn rows only. A library that declares each part as a function of its own, as Redux Toolkit does, holds cards. The parts and the rules of this page stay the same for every library; a library that needs a part this page has not got adds it to the table of parts and to `CardPart` in `packages/configurations/src/code-graph/code-blocks.ts`.
