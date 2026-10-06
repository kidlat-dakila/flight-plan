# Codegraph

## Definition

The codegraph is Flight Plan's map of how a change connects to the rest of the code. For every function or method a change touches, it records three things:

- **Who calls it**: every function that calls the changed function, and their callers, up to the entry points that nothing else calls.
- **What it calls**: the functions and components of the repository that the changed function calls or renders, and everything those call in turn.
- **What runs inside it**: the statements of the changed function in order, with their branches, and which of them the diff touched.

Flight Plan builds the codegraph from the syntax trees of the files themselves, read straight from git. It needs no language server, no prebuilt index and no checked-out working tree.

## Why it exists

A review artifact is only worth trusting if its structure is right. The Journey Flow Diagram and the Blast Diagram make claims about the code: this function calls that one, and this change reaches these places. If an agent drew those diagrams from reading the code, it could miss a caller or invent a connection, and a reviewer would have no way to tell. Reading enough files to find every caller would also cost the agent a large number of tokens on every review.

The codegraph splits the work in two. **Structure is derived**: Flight Plan computes who calls what, directly from the code, so the same change always gives the same structure. **Prose is authored**: the agent explains what the structure means, such as why a call path matters or what could break along it. Neither side writes the other's half, so an agent cannot restructure a diagram and the codegraph never makes up an explanation.

Three more properties follow from that goal:

- **It works on any machine with git.** Files are read from commits with git, so there is nothing to install, no index to build and no worktree to clean up.
- **Its cost follows the size of the change, not the size of the repository.** It parses only the changed files, the files a text search says might use them, and the files of the declarations the change calls.
- **It says where it stops.** When a function is passed around in a way static analysis cannot follow, such as through a store, an event bus or a spread of props, the codegraph records an escape marker at that point instead of silently leaving the path out. The reviewer then knows the reach may go further, and where to look.

## Terms

| Term | Meaning |
|---|---|
| **Head node** | The changed code itself: a changed condition, a new statement, a new function or a changed module-level value. |
| **Declaration** | A named function, method, component or module-level value. The codegraph reasons about declarations, not files or single lines. |
| **Root** | The declaration that holds a head node, and the node each tree starts from. In the example trees below, the root is the top line. |
| **Caller** | A declaration that reaches the root, or another caller, by calling it, rendering it, running a function handed to it, or using data produced from it. Callers grow the tree toward the entry points. |
| **Entry point** | A caller that nothing else calls, such as a route handler, a `main` function or a page component. The trace upward ends there. |
| **Child** | A declaration of the repository that the root, or another child, calls or renders. Children grow the tree downward. |
| **Callee** | A second changed declaration that a caller also calls, off the main path. It hangs from that caller instead of starting its own tree. |
| **Connection** | The link between two nodes. It has a place in the code, a kind and a certainty. |
| **Kind** | How a connection was made: **call** (a direct call or render), **value** (a function handed over and run later) or **data** (a value produced from the head node's function, or a changed module-level value, used by a declaration). |
| **Certainty** | **Proven** when the codegraph resolved the connection from the code, **assumed** when a rule connects code the codegraph cannot see into. |
| **Higher-order function** | A function that takes a function and gives something back: a hook, a composable, `debounce`, `withRetry`, a higher-order component. |
| **Thin wrapper** | A function written in place whose whole body calls the head node's function and returns its result, such as `(x) => mutateXYZ(x)`. It counts as passing the function itself. |
| **Escape marker** | A node that marks where the trace crossed a boundary static analysis cannot follow. The path may continue past it. |
| **Execution step** | One statement inside a root's body, on the way to the changed lines. |
| **Candidate search** | The text search (`git grep`) that finds the files that might use a declaration, before any of them is parsed. |

## Core logic

The codegraph answers one question for every change: **where does this code run from, and what does it run?** It starts at the changed code and works outward in both directions, and records for each connection how sure it is.

Four principles decide every rule below, in every language:

1. **The head node is the change. The trace starts from the declaration that holds it.** The head node is the changed code itself: a changed condition, a new statement or a new function. When the head node sits inside a function, or is a new function, the codegraph starts from that function and finds who uses it. A changed line belongs to the innermost declaration that contains it, so a change inside a local handler belongs to the handler, not to the component around it. In this example, the head node is the changed condition, and the trace starts from `validateFirstname`:

   ```ts
   export function validateFirstname(name: string) {
     if (name.length < 3) {
       throw new Error("First name must be at least 3 characters")
     }
   }
   ```

   A head node can also sit outside any function: a constant, a configuration object or a regular expression at module level. The codegraph then finds every declaration that uses it, connects each one to the head node as data, and climbs from there as usual. Here the head node is the new value of `MIN_FIRSTNAME_LENGTH`. The trace reaches `validateFirstname` through a data connection and continues from it, exactly as if the condition inside it had changed:

   ```ts
   export const MIN_FIRSTNAME_LENGTH = 3
   ```

   ```ts
   import { MIN_FIRSTNAME_LENGTH } from "./limits"

   export function validateFirstname(name: string) {
     if (name.length < MIN_FIRSTNAME_LENGTH) {
       throw new Error("First name is too short")
     }
   }
   ```

   Types and interfaces are never head nodes. A change that touches only a type, such as a TypeScript `interface` or `type`, does not change what runs, so the codegraph does not trace it.
2. **Prove it, or mark it as assumed.** A connection is **proven** when the codegraph has resolved a name to the declaration it means, through scopes, imports and re-exports. A different variable with the same name is not a connection. Some rules connect code the codegraph cannot see into, such as the results of a higher-order function or the implementations behind an interface. Those connections are recorded as **assumed**, never as proven.
3. **Trace everything, and label every connection.** The codegraph follows the head node's function wherever it goes, including everything a higher-order function produces from it, data as well as functions. Each connection carries two labels:
   - its **kind**: a direct **call**, a function handed over as a **value**, or **data** produced from the function;
   - its **certainty**: **proven** or **assumed**.

   The codegraph always delivers the whole trace. Consumers such as the Journey Flow Diagram use both labels to decide how much of it to show.
4. **Never lose a path silently.** When the trace crosses a boundary static analysis cannot follow, the codegraph records an escape marker at that point. A path is either traced or marked, never quietly dropped.

### Generic languages

This is the model for any language with functions and modules, such as TypeScript, JavaScript, Python, Go, Java or Rust.

**Start at the change.** Every declaration that owns a changed line becomes a root. That includes a function, method or component, and also a constant or other value declared at module level. A declaration that is only a type or an interface does not. A root that is a value has no callers, so the codegraph looks for the declarations that use it instead. Each one is connected as data and climbed from as usual.

**Climb to the entry points.** For each root, the codegraph asks "who calls this?":

1. A text search of the repository finds the files that mention the declaration's name. These are only candidates.
2. Each candidate is parsed, and every call of that name is resolved through the file's scopes and imports. A call counts only if the name really means the changed declaration.
3. Each proven call is attributed to the declaration that contains it. That declaration is a caller.
4. The same question is asked of each caller, and so on, until reaching declarations that nothing calls. These are the **entry points**: a route handler, a `main` function or a page component.

A declaration already on the current path is not climbed again, so recursive and mutually recursive callers end the climb instead of looping.

**Calls through an interface or an override.** When a call goes through an interface, an abstract method or a method that subclasses override, the code alone cannot say which implementation runs. The codegraph treats every implementation in the repository as a possible target, in both directions. Climbing up from a changed implementation, every call through the interface method counts as a caller. Looking down from a call through the interface, every implementation counts as called. These connections are marked assumed. When no implementation is in the repository, as with an interface from a package, the path ends with an escape marker.

**Follow functions passed as values.** A function is often handed around before it is called: passed as an argument, returned from another function, stored in a list or map, or registered with a framework. A method passed by reference, such as `api.save` or `this.handleSave`, counts as passing a function. The codegraph follows the function forward to the place where it is finally invoked, and then climbs from there as usual.

- **Registering with a framework is an invocation.** A route handler passed to `server.get(...)` counts as invoked there, because the framework calls it.
- **Handing it to a higher-order function from a package, without keeping the result, is an invocation.** In `items.forEach(mutateXYZ)`, `promise.then(mutateXYZ)` and `setTimeout(mutateXYZ, 100)`, the function runs, so the declaration holding that line is where it runs, by a value connection.
- **Handing it to something that gives nothing back and cannot be seen into ends the trace.** A store, an event bus and a computed lookup like `handlers[key]()` each end the path with an escape marker.

**Switch to what a higher-order function returns.** When the head node's function is passed *as a function* into a higher-order function, and what comes back is used, the trace switches to those results. It applies to every higher-order function, whether declared in the repository or in a package, because the results are what carry the change on. The function counts as passed in any of these forms:

- directly: `useSomeHook(mutateXYZ)`
- inside an object: `useSomeHook({ callback: mutateXYZ })`
- through a thin wrapper written in place, meaning a function whose whole body calls the head node and returns its result: `useSomeHook({ callback: (input) => mutateXYZ(input) })` or `useQuery({ queryFn: () => fetchReview(reviewId) })`

The result is followed whatever its shape and wherever it goes: a destructured object (`const { result, execute } = ...`), an array (`const [state, setState] = ...`), a single value read through members (`mutation.mutate()`, `mutation.data`), or a value passed straight on without a variable (`onSave={makeHandler(mutateXYZ)}`).

- A function result gets a value connection to the place where it runs.
- Any other result gets a data connection.
- Every connection out of a higher-order function is marked assumed, because the codegraph does not prove which result carries the head node's function. A result such as `reset` or `isIdle` may have nothing to do with the change, and the certainty label lets a consumer filter it out.

**How far data is followed.** Data is followed through assignments, arguments and props until it reaches a declaration that uses it. That declaration gets a data connection, and the climb continues from it as usual. Values computed from the data inside that declaration are not followed further. The same applies to a head node that is a module-level value.

**A call that does more is a plain call.** When the head node's function is called inside a callback written in place that does anything besides calling it and returning its result (`useSomeHook({ onSuccess: () => { mutateXYZ(); showToast() } })`), the trace does not switch to the higher-order function. The same applies to a callback with a block body that calls it without returning the result (`() => { mutateXYZ() }`). The declaration that contains the callback is the caller, the climb continues from it, and the higher-order function's results are not followed.

**Look all the way down.** For each root, the codegraph also records what the changed declaration calls or renders, resolved to declarations of the repository, and then what each of those calls, down to declarations that call nothing more in the repository. A declaration already on the current path is not entered again, so recursion and cycles end. The codegraph delivers the whole depth. The Journey Flow Diagram shows every level. Calls into packages are left out, because their code is not part of the repository. Calls that cannot be resolved to a declaration, such as a call on a parameter, are left out too.

**Read inside the change.** For each root, the codegraph lists the statements of its body in order, as a tree, because conditionals, loops and `try` blocks branch. It keeps only the statements on the path to the changed lines and marks the ones the diff touched.

**Join the pieces.** Changes that are connected through calls, in either direction, end up in one tree. Separate groups of changes stay separate trees. Each language is traced on its own, with no connections across languages.

#### Example: climbing to the entry point

A pull request changes the sale branch in `priceOf` (lines 2–3) and the first line of `checkout`:

```ts
export function priceOf(item) {
  if (item.onSale) {
    return item.price * 0.9
  }
  return item.price
}
```

```ts
export * from "./pricing"
```

```ts
import { priceOf } from "./index"

export function subtotal(items) {
  return items.reduce((sum, item) => sum + priceOf(item), 0)
}
```

```ts
import { subtotal } from "./cart"

export function checkout(cart) {
  const total = subtotal(cart.items)
  return total
}
```

```ts
import { checkout } from "./checkout"

export function CheckoutButton(cart) {
  return checkout(cart)
}
```

The files are `src/pricing.ts`, `src/index.ts`, `src/cart.ts`, `src/checkout.ts` and `src/ui.ts`. The codegraph builds one tree:

```text
priceOf            src/pricing.ts    root, holds the head node
└── subtotal       src/cart.ts       calls priceOf, imported through the src/index.ts re-export
    └── checkout   src/checkout.ts   calls subtotal, also changed
        └── CheckoutButton  src/ui.ts   calls checkout, nothing calls it: entry point
```

This shows three rules at work:

- `subtotal` imports `priceOf` from `./index`, not from `./pricing`. The codegraph follows the re-export to prove that the name means the changed function.
- `checkout` is changed too, but it does not get a second tree. It is connected to `priceOf` through `subtotal`, so it joins the same tree. The root is the change furthest from the entry point.
- Only the path to the change is kept inside `priceOf`. Its execution steps are the `if` and the `return` inside it, both marked as changed. The final `return item.price` is not on the path, so it is left out.

```text
if (item.onSale) {             conditional   changed
  then:
    return item.price * 0.9    return        changed
```

#### Example: functions passed as values

```ts
import { saveReview } from "./reviews"

export function registerRoutes(server) {
  server.post("/reviews", saveReview)
}

export function listenForSaves(bus) {
  bus.on("review-saved", saveReview)
}

export function runAction(action) {
  const handlers = { save: saveReview }
  return handlers[action]()
}
```

If `saveReview` changes:

- `registerRoutes` is where `saveReview` runs, because the server calls a registered route handler. The codegraph climbs on from `registerRoutes` to its callers.
- `listenForSaves` hands the function to an event bus. Whoever publishes `review-saved` will call it, and static analysis cannot know who that is. The path ends with an escape marker at `bus.on(...)`.
- `runAction` looks the function up with a key known only at run time. The path ends with an escape marker at `handlers[action]()`.

#### Example: higher-order functions

The head node is a change inside `mutateXYZ`. These uses pass it into `useSomeHook` as a function:

```ts
const { result, execute } = useSomeHook(mutateXYZ)
```

```ts
const { result, execute } = useSomeHook({ callback: mutateXYZ })
```

```ts
const { result, execute } = useSomeHook({ callback: (input) => mutateXYZ(input) })
```

```ts
const mutation = useSomeHook(mutateXYZ)
```

In each case the trace switches to what `useSomeHook` returns. `execute` (or `mutation.execute`) is followed as a value to wherever it runs, and `result` (or `mutation.result`) is followed as data to every declaration that uses it. All of these connections are marked assumed.

These uses call it instead:

```ts
const { result, execute } = useSomeHook({ onSuccess: () => { mutateXYZ(); showToast() } })
```

```ts
const { result, execute } = useSomeHook({ onSuccess: () => { mutateXYZ() } })
```

Each callback does more than call `mutateXYZ` and return its result, so each is a plain call. The declaration holding the line is the caller, the climb continues from it, and `result` and `execute` are not followed.

These package higher-order functions run the function without giving back a result that carries it:

```ts
export function saveAll(items) {
  items.forEach(mutateXYZ)
}
```

`saveAll` is where `mutateXYZ` runs, by a value connection, and the climb continues from `saveAll`.

#### Example: all the way down

```ts
export function checkout(cart) {
  const total = subtotal(cart.items)
  logger.info({ total }, "checkout")
  return applyDiscount(total, cart.coupon)
}
```

If `checkout` changes, the codegraph records `subtotal` and `applyDiscount` as what it calls, provided both are declared in the repository. It then records what they call: `subtotal` calls `priceOf`, and so on down, until a declaration calls nothing more in the repository. `logger.info` is a method on an object from a package, so it is left out.

```text
checkout             root, holds the head node
├── subtotal
│   └── priceOf
└── applyDiscount
```

With a configured depth of one level, the Journey Flow Diagram would show only `subtotal` and `applyDiscount`.

### JSX frameworks: React and Vue

Component frameworks add two ways of connecting code that are not plain function calls: **rendering** a component and **passing a function to it as a prop**. The codegraph treats both as connections, so a change in a small component can be traced up through the components that render it to the page or route it appears on.

The rules apply to any framework built on components and props, whether the markup is written in JSX (`<Button onClick={save} />`) or in a template (`<Button @click="save" />`):

- **Rendering is calling.** A component that renders `<ReviewList />` is a caller of `ReviewList`, just as if it had called `ReviewList()`. A capitalised element name is a component. A lowercase one (`<button>`, `<div>`) is a built-in element of the platform.
- **A function passed as a prop is followed into the child.** When a parent passes `onSave={saveReview}` to `<Editor>`, the codegraph follows `saveReview` into `Editor` through the prop's name, whether `Editor` reads it as `props.onSave`, destructures `{ onSave }` or renames it. It then keeps following it to wherever `Editor` invokes it, through as many components as it takes.
- **A thin wrapper in a prop counts as passing the function. A handler that does more is a plain call.** `<Button onSave={mutateXYZ} />` and `<Button onSave={() => mutateXYZ()} />` both pass the function, and the trace follows the prop into `Button`. `<Button onSave={() => { mutateXYZ(); closeDialog() }} />` does more than call it, so the component rendering `<Button>` is the caller, the climb continues from it, and the trace does not follow the prop into `Button`. This is the same thin-wrapper rule as for higher-order functions.
- **A handler on a built-in element is an invocation.** When the function reaches `<button onClick={onSave}>`, the platform calls it when the user acts. The component that renders that element is where the function runs.
- **A hook or composable is a higher-order function.** When the function goes into `useCallback`, a custom hook, a composable or a library hook such as `useMutation`, the trace switches to everything the hook returns. Returned functions are followed as values, and returned state is followed as data, all marked assumed. A thin wrapper such as `queryFn: () => fetchReview(reviewId)` counts as passing the function. When the function is called inside a callback that does more, the component is a plain caller and the hook's results are not followed.
- **Some boundaries end the trace.** A spread of props (`<Child {...props} />`) hides which prop carries the function. Context and stores hand it to whoever reads them. Each of these ends the path with an escape marker at the exact place, so the reviewer knows the reach may continue there. A higher-order component such as `withTracking(SaveButton)` is not a boundary. It is a higher-order function, so the trace switches to the component it returns, marked assumed.

#### Example: a prop drilled down to a button

A pull request changes `saveReview`. `ReviewPage` passes it down through `Editor` to `SaveButton`, which wires it to a `<button>`:

```tsx
import { saveReview } from "./reviews"
import { Editor } from "./Editor"

export function ReviewPage() {
  return <Editor onSave={saveReview} />
}
```

```tsx
import { SaveButton } from "./SaveButton"

export function Editor({ onSave }) {
  return <SaveButton onSave={onSave} />
}
```

```tsx
export function SaveButton(props) {
  return <button onClick={props.onSave}>Save</button>
}
```

```text
saveReview               root, holds the head node
└── SaveButton           runs it: <button onClick={props.onSave}>, a value handoff
    └── Editor           renders <SaveButton>
        └── ReviewPage   renders <Editor>, nothing renders it: entry point
```

`SaveButton` sits directly above the change, although it never names `saveReview`. The codegraph followed the function through the `onSave` prop of `Editor`, destructured there, then through the `onSave` prop of `SaveButton`, read there as `props.onSave`, to the `<button>` where the user triggers it. From `SaveButton` it climbs the render tree. `SaveButton` connects to the root with the kind `value`, and the nodes above it connect with the kind `call`.

#### Example: passing the function versus calling it in place

The head node is a change inside `mutateXYZ`, and `Button` wires its `onSave` prop to a `<button>`:

```tsx
export function Button({ onSave }) {
  return <button onClick={onSave}>Save</button>
}
```

When `Page` passes the function itself, or a thin wrapper around it, the trace follows it into `Button`:

```tsx
export function Page() {
  return <Button onSave={mutateXYZ} />
}
```

```tsx
export function Page() {
  return <Button onSave={() => mutateXYZ()} />
}
```

```text
mutateXYZ          root, holds the head node
└── Button         value: onSave reaches <button onClick={onSave}>
    └── Page       renders <Button>
```

When `Page` calls the function inside a handler that does more, the call belongs to `Page`, and the trace does not go into `Button`:

```tsx
export function Page() {
  return <Button onSave={() => { mutateXYZ(); closeDialog() }} />
}
```

```text
mutateXYZ          root, holds the head node
└── Page           calls mutateXYZ
```

#### Example: a hook

```tsx
import { saveReview } from "./reviews"
import { useAutosave } from "./useAutosave"
import { Toolbar } from "./Toolbar"

export function ReviewForm() {
  const { isSaving, save } = useAutosave(saveReview)
  return <Toolbar onSave={save} busy={isSaving} />
}
```

`saveReview` goes into `useAutosave` as a function, so the trace switches to what the hook returns:

- `save` is a function. It is followed into `Toolbar` through the `onSave` prop and on to the `<button>` that runs it, as a value connection.
- `isSaving` is data produced from `saveReview`. It is followed into `Toolbar` through the `busy` prop, as a data connection.

```text
saveReview           root, holds the head node
├── Toolbar          value, assumed: save reaches <button onClick={onSave}>
│   └── ReviewForm   renders <Toolbar>, proven
└── Toolbar          data, assumed: isSaving reaches the busy prop
    └── ReviewForm   renders <Toolbar>, proven
```

The connections out of `useAutosave` are marked assumed, because the codegraph does not prove which result carries `saveReview`. The render connections above them are proven. The Journey Flow Diagram receives both paths. It draws the assumed connections and leaves out the data path.

If `ReviewForm` instead called `saveReview` inside a callback that does more than call it, the hook's results would not be followed. `ReviewForm` would be a plain caller of `saveReview`:

```tsx
const { isSaving, save } = useAutosave({ onSuccess: () => { saveReview(); showToast() } })
```

#### Example: where the trace stops

```tsx
export function ReviewPage() {
  const handlers = { onSave: saveReview, onDiscard: discardReview }
  return <Editor {...handlers} />
}
```

If `saveReview` changes, the spread hides which prop carries it, so the path ends with an escape marker (`spread`) at `{...handlers}`.

```tsx
import { SaveButton } from "./SaveButton"
import { withTracking } from "./tracking"

export const TrackedSaveButton = withTracking(SaveButton)
```

If `SaveButton` changes, this is not where the trace stops. `withTracking` is a higher-order function, so the trace switches to `TrackedSaveButton`, marked assumed, and follows everywhere it is rendered.

#### Example: the same rules in a template

The rules do not depend on JSX. The Vue version of `SaveButton` gives the same tree:

```vue
<script setup lang="ts">
defineProps<{ onSave: () => void }>()
</script>

<template>
  <button @click="onSave">Save</button>
</template>
```

`<SaveButton>` in a template counts as rendering it, `:on-save="saveReview"` passes the function as a prop, and `@click` on the built-in `<button>` is where it runs.

## Output

### The shape of the tree

The codegraph returns a list of trees, one for each connected group of changes. Changes linked through any connection, in either direction, share a tree. Changes that have nothing to do with each other get separate trees.

Each tree starts at a root and grows in two directions:

- **Up through callers**, toward the entry points. This is why the tree is called inverted: a call tree normally starts at the entry point and grows down into what it calls, and the codegraph starts at the change and grows up into what calls it.
- **Down through children**, into what the root calls.

When one group holds several changes, the root is the change furthest from an entry point. The other changes appear in the tree where the trace reaches them, and each keeps its own execution steps.

The codegraph does not decide how the tree is drawn. The Journey Flow Diagram turns it the other way round, with entry points at the left. The Blast Diagram reads it as it is, outward from the change.

### Node

Every node points at one declaration and carries:

| Field | Content |
|---|---|
| `id` | The declaration's identity: its file and the line its name is on. The same declaration reached from two places has the same `id`. |
| `code` | Where the declaration is and what it is called: the repository-relative `file`, the display `name` (such as `isAdult` or `StockService.hasStock`), `definedAt` (the range of the name) and `enclosingRange` (the whole declaration). |
| `connection` | How this node connects to the node one step toward the root. Absent on the root. See [Connections](#connections). |
| `callers` | The nodes that reach this one. Empty on an entry point. |
| `children` | The nodes this one calls or renders, each with its own children, to the full depth. |
| `callees` | Other changed declarations this node calls off the main path. Absent when there are none. |
| `executionSteps` | The statements on the way to the changed lines. Present on a node that holds a head node, absent on a root that is a module-level value. See [Execution steps](#execution-steps). |
| `escape` | Present only on an escape marker. See [Escape markers](#escape-markers). |

Positions are 1-based lines and 0-based columns. A range starts at its first character and ends just after its last.

### Connections

A node's `connection` describes the link to the node one step toward the root:

| Field | Content |
|---|---|
| `kind` | `"call"`, `"value"` or `"data"`. See [Terms](#terms). |
| `certainty` | `"proven"` or `"assumed"`. |
| `at` | Where the connection is written, in this node's file: the call, the render, the place the handed-over function runs, or the place the data is used. For a child, it is where the parent calls the child. |

A path can change kind along the way. In the prop-drilling example, `SaveButton` connects to the root as a `value`, and the nodes above it connect as `call`. Certainty works the same way: the connections out of a higher-order function are `assumed`, and the renders above them are `proven`.

### Execution steps

A node that holds a head node lists the statements of its body that lead to the changed lines. The list is a tree, because some statements branch.

| Field | Content |
|---|---|
| `line` | The statement's line, counted from the first line of the declaration. |
| `text` | The source on that line. |
| `range` | The statement's range, counted from the first line of the declaration. |
| `type` | One of the step types below. |
| `changed` | Whether the diff touched this statement. A branching statement kept only because the change is inside one of its arms is `false`. |
| `branches` | The arms of a branching statement, each with a `label` and its own steps. Present on `conditional`, `loop` and `try`. |

Step types are the same in every language, and each language's parser maps its own syntax onto them:

| Type | Statement |
|---|---|
| `declaration` | A binding, or a nested function, class or type declaration |
| `expression` | An expression run for its effect, such as an assignment or a call |
| `conditional` | `if` or `switch`. Arms are labelled `then` and `else`, or by case value |
| `loop` | `for`, `while` or `do`. The arm is labelled `body` |
| `try` | `try`, `catch` and `finally`. Arms are labelled `catch` and `finally` |
| `return` | `return` |
| `throw` | `throw` or `raise` |
| `jump` | `break` or `continue` |
| `block` | A bare nested block |
| `other` | Anything else |

Only statements on the path to a change are kept. A statement before the change is kept when it is on the same straight path. An arm of a branch is kept only when the change is inside it.

### Escape markers

An escape marker is a node whose `escape` field holds the `reason` and the place (`at`) where the trace stopped. Its `code` names the boundary rather than a real declaration, and it has no callers. Its connection to the node below is always `assumed`.

| Reason | Where the trace stops |
|---|---|
| `spread` | Props spread into a component (`<Child {...props} />`), so the prop that carries the function is not known |
| `props` | A component whose props parameter cannot be taken apart, such as `(...args)` |
| `store` | A function put into a store or a context, such as a React context `Provider` value |
| `event-bus` | A function registered on or published to an event bus |
| `dynamic-dispatch` | A call through a key known only at run time, such as `handlers[key]()` |
| `interface` | A call through an interface or abstract method with no implementation in the repository |
| `decorator` | A Python decorator whose wrapping cannot be resolved |
| `dynamic-import` | A module loaded by a name computed at run time, such as Python's `importlib.import_module` |

## Language support

| Language | Files | Parser |
|---|---|---|
| TypeScript and JavaScript, including JSX for React | `.ts`, `.mts`, `.cts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.jsx` | acorn |
| Python | `.py`, `.pyi` | tree-sitter |

A change can touch several languages at once. The changed files are grouped by language, each group is traced on its own, and the trees are returned together. A file no language claims is left out.

### Adding a language

A language is two pieces, registered together in `tracer/languages.ts`:

- **A language tracer** (`LanguageTracer` in `tracer/language.ts`):
  - the file extensions it claims;
  - `declarationsOf`: the declarations of a file;
  - `callGraph`: who calls a declaration, built on the shared candidate search;
  - `reach`: the forward trace of a function passed as a value.
- **A step parser** (`LanguageParser` in `parsers/index.ts`): turns a declaration's body into statements with the step types above.

The language also provides `makeRepo`, which builds whatever it needs to resolve imports, such as path aliases or workspace packages. The code that climbs callers, merges trees and builds execution steps is shared, and must not name a language's syntax.

A language is done when every rule in [Core logic](#core-logic) that applies to it has a test fixture, including the rules that end in an escape marker.

## Consumers

### Journey Flow Diagram

The Journey Flow Diagram shows the path a change runs through, left to right. It turns the tree the other way round:
- Entry Point Nodes are at the left, each standing for what starts a flow from outside the code and attached to one of the codegraph's entry points;
- the callers from those entry points down to the root are Tail Nodes;
- every changed declaration in the tree is a Head Node. The root is the one where the paths end, and the others sit along the path. That is how merging connected changes shows up in the diagram.

See [Journey Flow Diagram](journey-flow-diagram.md).

It receives the whole trace and always draws the same part of it:
- every level of callers and children;
- every assumed connection;
- no data connections.

### Blast Diagram

The Blast Diagram shows what a change can affect. It reads the tree as it is, outward from the change. Each node's distance from the root, in connections, decides its ring:
- the changed declarations are the Epicenter Nodes;
- declarations one connection away are Direct Impact Nodes;
- declarations further out are Indirect Impact Nodes.

See [Blast Diagram](blast-diagram.md).

### MCP tools

When an agent starts a review, Flight Plan builds the codegraph and turns it into the structure of both diagrams before the agent writes anything. The agent's tools can fill in labels and explanations for existing nodes, but have no field for adding, moving or removing a node, and none for saying that a segment has no diagram or why. The codegraph owns the structure, and the agent owns the prose.

## Where it lives in the code

The codegraph is the `packages/codegraph` package. Its engine is in `packages/codegraph/src/core/`, and the backend imports it as `@flightplan/codegraph`. The same package holds the builders of the two consumers above and of the Code Walkthrough, in `src/journey/`, `src/blast/`, `src/walkthrough/` and `src/scaffold/`. The shapes they read and write are in `packages/configurations`. The grammar `.wasm` files tree-sitter loads are in `packages/codegraph/tree-sitter/`.

The entry point is `buildMultiLanguageDiagram`. It takes:
- the changed files, each with its changed line ranges;
- a reader for the repository's files at the reviewed commit;
- the candidate search.

It returns the list of trees. The work runs in this order, in files under `src/core/`:

| Stage | Where |
|---|---|
| Group the changed files by language and build each language's repository view | `build-multi-language-diagram.ts`, `tracer/languages.ts` |
| Trace each group, one changed file at a time over a shared repository view | `build-diagram-tree.ts`, `build-diagram-tree-from-file.ts` |
| Find the declarations of a changed file | `tracer/<language>/declarations.ts` |
| Pick the roots: the innermost declaration owning each changed line | `build-stack-tree.ts` |
| Climb the callers to the entry points | `tracer/caller-tree.ts`, `tracer/call-search.ts`, `tracer/<language>/call-graph.ts` |
| Follow functions passed as values, and higher-order functions | `tracer/<language>/value-flow.ts`, `tracer/<language>/reach.ts` |
| Collect the children | `tracer/typescript/children.ts` |
| Build the execution steps | `build-execution-steps.ts`, `parsers/<language>.ts` |
| Merge the trees of connected changes | `merge-diagrams.ts` |
| The output types | `types.ts` |

`demo.ts` runs the whole pipeline over a small repository held in memory, and `demo.output.json` is its recorded output. Each `__tests__/` folder holds a test fixture for each rule of the code beside it.
