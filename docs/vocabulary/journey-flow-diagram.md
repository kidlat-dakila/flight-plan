# Journey Flow Diagram

## Definition

The Journey Flow Diagram shows how execution reaches a change. It answers the reviewer's first question about any change: when does this code run, and what leads to it?

The Journey Flow Diagram reads like a debugging trace of the change. It is drawn in the order the code runs, from what triggers it to the changed code:

```text
Entry Point Node → Code Node → Code Node (changed) → Code Node (changed)
```

Every path starts at an Entry Point Node and ends at changed code. The diagram does not continue past the last change on a path; what a change affects afterwards is shown by the [Blast Diagram](blast-diagram.md).

## Nodes

| Node | What it stands for |
|---|---|
| **Entry Point Node** | What triggers a path from outside the code. It has no code of its own. Every path has one. |
| **Code Node** | Code on a path. It is never a single line. |

A Code Node is one of three things:

| Code Node | What it stands for | Named |
|---|---|---|
| An encapsulation | A top-level function, component, hook, class or module-level value. A change inside a nested function belongs to the node of the encapsulation that holds it. | `OrderStatusFilter` |
| A handler | The code a user action runs in a component. See "How JSX is handled differently". | `OrderStatusFilter.onClick`, `CartLine.handleRemove` |
| The top level of a file | The changed bare statements of a file. See "Changes outside any encapsulation". | `top level` |

A Code Node has no role such as head or tail. It carries one fact from the diff: it is **changed** or it is not. That fact is stored as `changeType`: `diff` for a changed node, `related` for an unchanged node, which is on the diagram only because it leads to changed code. A traced line keeps a plain `isChanged`. The events and the data listed on a component say more than that about each entry: see "Events and data of a component". A change can sit anywhere on a path, and a path can hold several.

## Entry points

The Entry Point Node is named after what sits at the top of the path:

| The top of the path | Entry Point Node |
|---|---|
| A page or route component that nothing renders | A user visits the page |
| A handler on a built-in element, such as `onClick` or `onSubmit` | A user action |
| An `on…` prop on a component the trace cannot open, such as a button of a component library | A user action. The trace ends on that prop |
| A function handed to `addEventListener` | A user action, named after the event and what listens for it |
| A route handler, such as `POST` or `GET` | An API call |
| A job, a command or `main` | That job or command |
| A boundary the trace cannot cross, such as an event bus or a context no component reads | Reached through that boundary |
| An export that nothing uses | Not used yet |
| The top level of a file | The app starts |

An Entry Point Node carries where the trace ended: the file, the line and its source, the event, what the user acts on, and the library when the trace ended on a component from outside the repository. The agent reads it to write the label.

## How the diagram is built

The diagram is built from one group of files: the changed files that import each other, with everything they import and everything that imports them. A change in files that share no import with the group is in a group, and a diagram, of its own.

1. **Start at every change.** Each encapsulation that holds a changed line is a starting point. Several changed lines inside one encapsulation are one node.
2. **Climb to what triggers it.** From each starting point, the trace follows what uses it, then what uses that, until nothing does. What a use is decides the next step: a call or a render makes the code that holds it the next node, and the uses in the table of entry points end the path.
3. **Name the trigger.** The top of each path gets its Entry Point Node from the table above.
4. **Give each user action its handler node.** See "How JSX is handled differently".
5. **Merge the paths.** A Code Node appears once, however many paths cross it. Every path is drawn, however many there are. Changes that are connected share their nodes, and changes that are not connected are separate paths.
6. **Fold what only forwards.** See below.
7. **Add the traced lines.** See below.
8. **Set the category, and list the events and the data of each component.** See "Node categories" and "Events and data of a component".
9. **Leave out an entry point with no node under it.** An Entry Point Node is drawn only when it leads to a Code Node. An entry point with one Code Node under it is a path and is drawn.

Nothing is traced downward from a change, so a path ends at its last change.

Because every change is a starting point, a diff that adds a function and also wires it in draws the wiring: the code that calls the function and the code that uses its results are changed too, so each is on a path of its own.

## How JSX is handled differently

One trace serves every language. A file with JSX is traced differently only because of what its syntax says: an element has handlers, a component renders other components, a value is handed to a context, a route names a page. A file without JSX has none of these, so a function in it is one node and its entry point is an API call, a command, an event bus, the start of the app or "Not used yet".

### A component has a render node and a node for each handler

A component is one Code Node for what it renders. A page visit leads to it, and the components it renders hang from it.

A user action does not lead to that node. It leads to a Code Node for the handler the event runs:

- **What it covers.** The handler attribute on the element, such as `onClick={…}`, and every function declared in the component that runs at it.
- **Its name.** The component and the handler: `CartLine.handleRemove`. A function written in place takes the name of the attribute: `OrderStatusFilter.onClick`. Two buttons of one component are two nodes.
- **Its edges.** What the handler calls leaves from the handler node. What the render body calls leaves from the component.
- **Whether it is changed.** It is changed when a changed line is inside it. The component is changed only when a changed line is outside its handlers.
- **A listener.** A function handed to `addEventListener` inside a component gets the same kind of node, named after the event: `Shortcuts.keydown`.

```text
[A user visits /orders]  → OrdersPage → OrderStatusFilter → STATUSES (changed)
[A user clicks All]      → OrderStatusFilter.onClick → useOrderFilterStore (changed)
```

### A handler that is a prop belongs to the component that hands it over

When the element's handler runs a prop, the handler node is the function of the component that passed the prop in. The edge from the entry point lists the element's own handler and the props between.

```text
[A user clicks the button] → CartPage.handleCheckout → placeOrder (changed)
                             through Button.onClick, CheckoutButton.onCheckout
```

### A function handed to a hook is followed through the hook's result

When the changed function is handed to a hook or another higher-order function, the code around it does not say when it runs. The trace follows what the hook returns to each place that uses it. A result used in a handler leaves from that handler's node, under a user action. A result read in the render body leaves from the component, under a page visit. Such an edge is a value the trace assumes, not a call it can prove.

### A function handed to a context is followed to the components that read it

A function given to a `Provider` as its value is traced to the components that read the context with `useContext` or `use`, and takes its entry point there, the same way as the result of a hook. A reader that takes one member of the context value is on the path only when that member is the one provided. When no component reads it, the path ends at "Reached through a context".

### A page takes the route it is rendered at

A component that is the `element` or `component` of a route ends its path at the visit of that route, named with its whole path and the paths above it: "A user visits /shop/cart". A component nothing renders ends at "A user visits the page".

### What a component renders is part of the trace

See "Rendering logic": a component rendered under a condition or in a loop is a node like any other, and a branch that renders only built-in elements is traced lines of the component.

## Changes outside any encapsulation

A changed line at the top level of a file belongs to no encapsulation. What happens to it depends on what it is:

| The changed line | In the diagram |
|---|---|
| An import | No node. When the imported name matters, its use is changed too, inside an encapsulation, and that is traced. |
| A type or an interface | No node. Nothing that runs is different. |
| A bare statement, such as `app.use(rateLimit())`, `initAnalytics()` or a route registration like `router.post("/users", createUser)` | A Code Node for the top level of that file, marked as changed. Its traced lines are the changed statements. |

A module-level value such as `export const MAX_RETRIES = 5` is an encapsulation, so it is a Code Node like any other and the trace climbs from it to the code that reads it.

## Folding

An unchanged encapsulation that only forwards is not drawn as a node. Its hand-over becomes a step on the edge that passes through it. An encapsulation only forwards when it does one of:

- passes a prop straight on: `<SaveButton onSave={onSave} />`
- re-exports a name
- wraps a call and nothing else: `(user) => addUser(user)`

A changed encapsulation is always drawn, even when it only forwards.

## Traced lines

A Code Node carries its traced lines: the lines of that node the path goes through, in order, as a debugger would step through them.

- **For a changed node**, they run up to its changed lines.
- **For a node the diff did not touch**, they run up to where the path leaves it for the next node.
- **For the node of a handler**, they are what the action runs: the element the user acts on, and the handler declared in the component that the element names. Two buttons of one component are two nodes with different traced lines.

Traced lines are how the inside of a node is shown without more nodes: a branch, a loop or a `.map` of a component is lines of that component, not a node of its own. An edge carries no lines.

Traced lines are lines of the source, with their line numbers, and the lines the diff touched are marked:

- A statement on the way is listed with every line it spans, so a `return (` shows the whole element it returns.
- A branch or a loop the path does not go into is listed by its first line only, without its body.
- A function declared inside the node is listed by its first line, and its body follows only when the path goes through it.
- An element is a unit like a statement. The traced lines step into the elements above the hand-over, lists the elements rendered before it, and stops at it: the elements after it and the closing tags are left out.
- Nothing that runs after the hand-over, or after the changed lines, is listed.

## Rendering logic

In a component, what is rendered is part of the trace. A component often renders one thing or another depending on a condition, or renders something once per item of a list, and the diagram shows that.

- **A component rendered under a condition or in a loop is a node like any other.** The diagram does not say which condition: neither the edge nor the page carries it. The conditional or the loop is in the traced lines of the component that renders it.
- **A branch that renders only built-in elements is traced lines, not a node.** A warning written in place as `<p>No users yet</p>` belongs to the component that renders it. It appears in that component's traced lines, under the conditional it sits in.

A path through a branch is drawn under the same rule as any other: it is drawn when it leads to changed code.

```tsx
// home.tsx
const Home = () => {
  const users = useUsers()

  if (users.length === 0) return <EmptyWarning />     // rendered if there is no user

  return <UserList users={users} />                   // rendered otherwise
}
```

With changes inside both `UserList` and `EmptyWarning`:

```text
[A user visits /home] → Home ─→ UserList (changed)
                            └─→ EmptyWarning (changed)
```

## Examples

Each example says what it is there to show. `// diff` marks a changed line. `(changed)` marks a changed node.

### 1. A change at the end of a chain

**Shows:** the path stops at the change. Code that uses the change's result is not drawn.

```tsx
// page.tsx
const Page = () => {
  const { data, status, execute } = addUser()

  return <UserForm onSubmit={execute} formData={data} status={status} />
}

// addUser.ts
const addUser = () => {                               // diff
  ...
}
```

```text
[A user visits the page] → Page → addUser (changed)
```

`UserForm` is not drawn. It receives what `addUser` returns, which happens after the change.

### 2. A change in the middle of a chain

**Shows:** the stop rule also cuts off what the changed code calls. Nothing unchanged is drawn after the last change.

```tsx
// page.tsx
const Page = () => {
  const users = loadUsers({ activeOnly: true })       // diff

  return <UserList users={users} />
}

// loadUsers.ts
const loadUsers = (options) => {
  ...
}
```

```text
[A user visits the page] → Page (changed)
```

Neither `loadUsers` nor `UserList` is drawn. Both are unchanged and both run after the changed line.

### 3. A change with its wiring

**Shows:** every changed encapsulation is a starting point, so new code is drawn together with the code that wires it in.

```tsx
// addUser.ts
const addUser = () => {                               // diff
  ...
}

// page.tsx
const Page = () => {
  const { data, status, execute } = addUser()         // diff

  return <UserForm onSubmit={execute} formData={data} status={status} />   // diff
}

// UserForm.tsx
const UserForm = (props) => {
  const handleOnSubmit = () => {
    props.onSubmit()                                  // diff
  }

  return <form onSubmit={handleOnSubmit}>...</form>   // diff
}
```

```text
[A user visits the page] ──→ Page (changed) ──→ addUser (changed)
                                          └──→ UserForm (changed)
[A user submits the form] ─→ UserForm.handleOnSubmit (changed)
```

Compare with example 1: the code is the same, and `UserForm` is drawn here only because it is changed. `Page` renders it, and the submit of its form runs its handler, which is a node of its own.

### 4. Two changes on one path, with unchanged code between them

**Shows:** connected changes share one diagram, and an unchanged node between two changes is kept because the path runs through it.

```ts
// routes/orders.ts
const postOrder = async (request) => {
  const order = parseOrder(request.body)              // diff
  return placeOrder(order)
}

// placeOrder.ts
const placeOrder = async (order) => {
  await reserveStock(order)
  return save({ ...order, total: totalOf(order) })
}

// totalOf.ts
const totalOf = (order) => roundOnce(sum(order.lines)) // diff
```

```text
[POST /orders] → postOrder (changed) → placeOrder → totalOf (changed)
```

One diagram, not two. `placeOrder` is unchanged but it does work on the way, so it is a node and not a fold.

### 5. Changes that are not connected

**Shows:** changes with no path between them get separate diagrams, each with its own entry point.

```ts
// routes/orders.ts
const postOrder = async (request) => { ... }          // diff

// routes/health.ts
const getHealth = () => ({ status: "ok", version })   // diff
```

```text
Diagram 1:  [POST /orders] → postOrder (changed)
Diagram 2:  [GET /health]  → getHealth (changed)
```

### 6. A page visit and a user action in the same component

**Shows:** the entry point depends on where in the component the use sits. Code in the render body runs on a visit. Code in a handler runs on the action.

```tsx
// users-page.tsx
const UsersPage = () => {
  const users = loadUsers()                           // runs when the page renders

  const handleDelete = (id) => {
    removeUser(id)                                    // runs when the button is clicked
  }

  return <button onClick={() => handleDelete(users[0].id)}>Delete</button>
}
```

When `loadUsers` is changed:

```text
[A user visits /users] → UsersPage → loadUsers (changed)
```

When `removeUser` is changed:

```text
[A user clicks Delete] → UsersPage.handleDelete → removeUser (changed)
```

The click leads to the node of the handler, not to `UsersPage`. When both are changed, both paths are in one diagram: `UsersPage` is the node of the visit and `UsersPage.handleDelete` the node of the click.

### 7. An API endpoint

**Shows:** on the server the entry point is the API call, named with its method and path.

```ts
// routes/users.ts
router.post("/users", createUser)

// createUser.ts
const createUser = async (request) => {
  const user = parseUser(request.body)
  await sendWelcome(user)                             // diff
  return save(user)
}
```

```text
[POST /users] → createUser (changed)
```

### 8. A hook

**Shows:** a hook is an encapsulation like any other. The component that calls it is its caller.

```tsx
// home.tsx
const Home = () => {
  const users = useUsers()

  return <UserList users={users} />
}

// useUsers.ts
const useUsers = () => {
  return useQuery({ queryKey: ["users"], queryFn: fetchActiveUsers })   // diff
}
```

```text
[A user visits /home] → Home → useUsers (changed)
```

### 9. A forwarder folded into the edge

**Shows:** an unchanged encapsulation that only wraps a call is not a node. Its hand-over is a step on the edge.

```tsx
// UserForm.tsx
const UserForm = (props) => {
  const [firstName, setFirstName] = useState("")

  const handleOnSubmit = () => {
    props.onSubmit({ firstName })
  }

  return <button onClick={handleOnSubmit} />
}

// page.tsx
const Page = () => {
  const handleSubmit = (newUser) => addUser(newUser)

  return <UserForm onSubmit={handleSubmit} />
}

// addUser.ts
const addUser = (user) => {                           // diff
  ...
}
```

```text
[A user clicks the button] → UserForm.handleOnSubmit ───→ addUser (changed)
                                      through Page.handleSubmit
```

`Page` adds nothing a reviewer needs to read. Two nodes instead of three.

### 10. A prop drilled through several components

**Shows:** every forwarder on the way is folded, however many there are. The handler of the element the user acts on stays, because it is what the entry point triggers.

```tsx
// review-page.tsx
const ReviewPage = () => <Editor onSave={saveReview} />

// editor.tsx
const Editor = ({ onSave }) => <SaveButton onSave={onSave} />

// save-button.tsx
const SaveButton = (props) => <button onClick={props.onSave}>Save</button>

// reviews.ts
const saveReview = () => {                            // diff
  ...
}
```

```text
[A user clicks Save] → SaveButton.onClick ──────────────────→ saveReview (changed)
                                  through Editor.onSave, ReviewPage
```

### 11. A changed forwarder

**Shows:** a changed encapsulation is always drawn, even when it only forwards.

Same code as example 10, with the forwarding line in `Editor` changed as well:

```tsx
// editor.tsx
const Editor = ({ onSave }) => <SaveButton onSave={onSave} variant="primary" />   // diff
```

```text
[A user clicks Save] ────────────────→ Editor.onSave (changed) ──→ saveReview (changed)
                     through SaveButton.onClick                through ReviewPage
[A user visits the page] → ReviewPage → Editor (changed)
```

`Editor` is changed on the line that holds both its markup and the prop it passes on, so both of its nodes are drawn: `Editor.onSave` under the click, and `Editor` under the visit that renders it.

### 12. A rendering branch written in place

**Shows:** a branch that renders only built-in elements has no component to be a node. It is traced lines of the component that renders it.

```tsx
// home.tsx
const Home = () => {
  const users = useUsers()

  if (users.length === 0) {
    return <p className="warning">{emptyMessage()}</p>    // diff
  }

  return <UserList users={users} />
}

// emptyMessage.ts
const emptyMessage = () => {
  return "No users yet"                               // diff
}
```

```text
[A user visits /home] → Home (changed) → emptyMessage (changed)
```

The traced lines of `Home`:

```text
3    const users = useUsers()
5    if (users.length === 0) {
6      return <p className="warning">{emptyMessage()}</p>     changed
```

The `<UserList>` branch is not listed. The change is not inside it. The example under "Rendering logic" is the other case, where each branch renders a component and each is a node.

### 13. Traced lines in detail

**Shows:** which lines a node lists. An unchanged node runs up to the hand-over, a changed node up to its changed lines. Nothing after.

```ts
// routes/users.ts
const postUser = async (request) => {
  const input = await request.json()
  if (!input.email) {
    return badRequest()
  }
  const user = await createUser(input)
  return created(user)
}

// createUser.ts
const createUser = async (input) => {
  const user = parseUser(input)
  if (await exists(user.email)) {
    throw new Conflict()
  }
  await sendWelcome(user)                             // diff
  return save(user)
}
```

```text
[POST /users] → postUser → createUser (changed)
```

| Node | Traced lines | Left out |
|---|---|---|
| `postUser`, not changed | `const input = await request.json()`, then `if (!input.email) {` without its body, then `const user = await createUser(input)` | The body of the `if`, since the path does not go into it. `return created(user)`, since it runs after the hand-over to `createUser`. |
| `createUser`, changed | `const user = parseUser(input)`, then `if (await exists(user.email)) {` without its body, then `await sendWelcome(user)` marked as changed | The `throw`, since the change is not inside that branch. `return save(user)`, since it runs after the change. |

The entry point `POST /users` has no lines. What triggers `postUser` is not code.

### 14. Shared code reached from two places

**Shows:** every path is drawn. The changed node appears once.

```tsx
// cart-page.tsx
const CartPage = () => <span>{formatPrice(cart.total)}</span>

// product-page.tsx
const ProductPage = () => <span>{formatPrice(product.price)}</span>

// formatPrice.ts
const formatPrice = (cents) => {                      // diff
  ...
}
```

```text
[A user visits /cart]     → CartPage    ─┐
                                         ├→ formatPrice (changed)
[A user visits /products] → ProductPage ─┘
```

### 15. New code nothing uses yet

**Shows:** a path always has an entry point, even when nothing in the repository reaches the change.

```ts
// exportUsers.ts
export const exportUsers = () => {                    // diff, a new function with no caller
  ...
}
```

```text
[Not used yet] → exportUsers (changed)
```

### 16. A context

**Shows:** a function handed to a context is followed to the component that reads it, and to the action that runs it there. When no component reads it, the context is the entry point. The path is never dropped.

```tsx
// app.tsx
const App = () => (
  <SaveContext.Provider value={saveReview}>
    <ReviewPage />
  </SaveContext.Provider>
)

// review-page.tsx
const ReviewPage = () => {
  const save = useContext(SaveContext)
  return <button onClick={save}>Save</button>
}

// reviews.ts
const saveReview = () => {                            // diff
  ...
}
```

```text
[A user clicks Save] → ReviewPage.onClick → App → saveReview (changed)
```

`ReviewPage` reads the context, and `App` hands `saveReview` to it. Without a component that reads `SaveContext`, the path is:

```text
[Reached through a context] → App → saveReview (changed)
```

### 17. A change to types only

**Shows:** no diagram at all. Nothing that runs is different.

```ts
// user.ts
export interface User {
  id: string
  nickname?: string                                   // diff
}
```

### 18. A change on both sides of a request

**Shows:** the trace does not cross from client to server. Each side is its own diagram with its own entry point.

```tsx
// users-page.tsx
const UsersPage = () => {
  const handleAdd = async (user) => {
    await addUser(user)
  }

  return <form onSubmit={handleAdd}>...</form>
}

// addUser.ts
const addUser = async (user) => {
  await fetch("/api/users", { method: "POST", body: JSON.stringify(user) })   // diff
}

// routes/users.ts
router.post("/api/users", createUser)

// createUser.ts
const createUser = async (request) => {
  return saveUser(parseUser(request.body))
}

// saveUser.ts
const saveUser = async (user) => {                    // diff
  ...
}
```

```text
Diagram 1:  [A user submits the form] → UsersPage.handleAdd → addUser (changed)
Diagram 2:  [POST /api/users]         → createUser          → saveUser (changed)
```

### 19. A function handed to a library hook

**Shows:** when a hook decides when the changed function runs, the entry point comes from where the hook's result is used.

```tsx
// users-page.tsx
const UsersPage = () => {
  const query = useQuery({ queryKey: ["users"], queryFn: fetchUsers })
  const mutation = useMutation({ mutationFn: removeUser })

  return (
    <>
      <UserList users={query.data} />
      <button onClick={() => mutation.mutate(1)}>Delete</button>
    </>
  )
}
```

When `fetchUsers` is changed, `query.data` is read in the render body:

```text
[A user visits /users] → UsersPage → fetchUsers (changed)
```

When `removeUser` is changed, `mutation.mutate` is called from the `onClick` of a `<button>`:

```text
[A user clicks Delete] → UsersPage.onClick → removeUser (changed)
```

Both hand-overs look the same to the trace: a function passed into a hook from a package. Only following the result tells them apart.

### 20. A bare statement at the top level of a file

**Shows:** a changed statement outside every encapsulation still gets a node, for the top level of its file. A changed import beside it gets none.

```ts
// server.ts
import { rateLimit } from "./rate-limit"              // diff, no node

const app = createApp()

app.use(rateLimit({ perMinute: 60 }))                 // diff
```

```text
[The app starts] → server.ts, top level (changed)
```

The traced lines of the node: `app.use(rateLimit({ perMinute: 60 }))`, marked as changed.

## When there is no diagram

A change that touches only types, interfaces or import lines changes nothing that runs, so it has no Journey Flow Diagram.

## Node categories

Each Code Node has a visual category, chosen by one test: would a reviewer scanning the board want this told apart at a glance?

| Category | Code |
|---|---|
| `guard` | A validator, gate, permission check or schema check: code whose job is to refuse |
| `logic` | A function or method that transforms. The default. |
| `data` | A query, repository, migration or cache access |
| `type` | An interface, type alias, schema or enum |
| `ui` | A JSX component, and nothing else |
| `event` | The handler node of a user action, and nothing else |
| `config` | A constant, flag, environment setting or build setting |

The codegraph gives `ui` to every component, which is a root encapsulation with a capitalised name, or a default export, that holds JSX markup. It gives `event` to every handler node, such as `OrderStatusFilter.onClick` or `Shortcuts.keydown`. It gives `logic` to every other node: a function, the top level of a file, and a constant that holds markup such as a route table. `ui` and `event` belong to the codegraph: the agent cannot give either to a node, and cannot replace either on a node that has it. The agent can replace `logic` with `guard`, `data`, `type` or `config`.

## Events and data of a component

A Code Node of the category `ui` carries two more lists. Every other node has both empty.

| List | What it holds | Named |
|---|---|---|
| `events` | Every callback the component hands over in its markup, and every event it listens to with `addEventListener` | `<element>.<attribute>`, such as `button.onClick` or `CheckoutButton.onCheckout`; `<target>.<event>`, such as `window.keydown` |
| `data` | Every variable the component's markup reads that is defined outside the markup | The variable, such as `items` or `status` |

Each entry is `{ name, changeType, reference }`. `reference` is the first and the last line the entry is on. An entry of `events` also has `nodeId`: the id of the handler node that event leads to, or `null` when the diagram draws no handler node for it. An entry is listed once for each place it is on, in the order of the lines.

`changeType` says how the entry stands to the diff:

| `changeType` | Meaning | Example |
|---|---|---|
| `diff` | A changed line is on the entry's own lines | The line of `onClick={handleRemove}` was edited |
| `related` | The entry's lines are untouched, and a changed line is on what the entry is linked to inside the component: a function declared in the component that the event hands over, or the declaration of the variable | `onClick={handleRemove}` is untouched and a line of `handleRemove` changed; `{total}` is untouched and `const total = ...` changed |
| `none` | Neither | `onClick={handleEdit}` where `handleEdit` is untouched |

The link is followed one step and never leaves the component, with one exception: a variable is also `related` when it is a changed value that has no node of its own, as described below. An event whose untouched handler calls a changed function of another file is `none`: that link is a path of the diagram.

An attribute is a callback when its name starts with `on` and a capital letter, when a function is written in place as its value, or when its value is a function declared in the component. A function that is an argument of a call inside the attribute, such as the one in `value={items.filter((item) => item.inStock)}`, does not make it a callback.

`data` holds only variables defined outside the markup: a variable the markup declares itself, such as `product` in `products.map((product) => ...)`, is left out. It also leaves out the names of the components rendered, the functions the markup calls by name, such as `formatPrice` in `{formatPrice(total)}`, and everything inside a callback attribute. The object of a method call stays: `products` in `products.map(...)` is data.

The codegraph writes both lists. The agent reads them and cannot write them.

### A value read in the markup is data, not a node

A value that a component reads in its markup, such as a constant `STATUSES` in `{STATUSES.map(...)}`, has no Code Node. It is an entry of the component's `data`, and when the diff changed the value, the entry is `related`.

- This holds for a value: a constant, an array, an object. A function the markup calls keeps its node.
- It also holds for a function handed to a hook when a component reads the hook's result in its markup, such as `selectStatus` in `const status = useOrderFilterStore(selectStatus)` with `{status}` in the markup. The entry is the variable that keeps the result, `status`. Other components that read the result of the same function in their body do not bring the node back.
- A value or such a function keeps its node when code that is not a component uses it too, when a component only reads it outside its markup, or when it runs other code itself.
- A handler node that led only to a value with no node is not drawn, and neither is its user action.
- When the only change of a diagram is such a value, the diagram is still drawn: the paths end at the components that read it, and the diagram is named after them.

## The UI card

On the page, the components of a diagram are not drawn as a card each. Every top-most component, usually a page, gets one **UI card**, and each component it renders, at any depth, is a frame inside the frame of the component that renders it. The card's header names the top-most component and its file.

| Part of the card | What it shows |
|---|---|
| A frame | One component: its label, "Added" or "Modified", and its data |
| The data line | The names in `data`, once each. A changed component lists all of them, an unchanged one only those that are `diff` or `related`. Past six names the rest is counted. |
| A trigger row | A user action of that component. The first line is the label of the Entry Point Node, such as `A shopper clicks "All"`. The second line is the event that catches it and its line, such as `Button.onClick :12`. |

How the card connects to the rest of the diagram:

- **A user action has no sign of its own.** Its Entry Point Node is drawn as the trigger row, inside the component it happens in. Choosing the row opens that entry point.
- **The line to an event node starts at the trigger row.** It leaves the right edge of the card at the height of the row, with a dotted lead-in from the row to the edge.
- **Only an event with an event node gets a row.** An event of `events` whose `nodeId` is `null` is not drawn.
- **A render between two components is not a line.** The frame inside the frame says it.
- **Every other line attaches at a row.** A page visit arrives at the left edge at the row of the component it opens, and a call to a hook, a store or a function leaves the right edge at the row of the component that makes it.
- **Two top-most components are two cards.** A component rendered by both is drawn inside each, and a line that starts at it starts at each.
- **An event node whose component is not on the diagram** gets a card with one frame, named after the component, so that its trigger has a row.

A page visit, an API call, a command and the other entry points stay signs outside the card.

## Edges

An edge joins two nodes in the order the code runs:

- From an **Entry Point Node** to a **Code Node**: the trigger. It is not code. A user action arrives at the node of the handler it runs, never at the component.
- Between two **Code Nodes**: the left one runs the right one, by calling it, rendering it or running a function handed to it. The hand-overs of any folded encapsulations are listed on the edge.

An edge stores its `kind` (`trigger`, `call`, `value`, `data`), its `certainty` (`proven`, `assumed`) and its `through`. The agent reads them. It does not store the condition a component is rendered under.

**On the page every edge is the same line.** There is one line style, an arrow from the left node to the right one, and no line carries a label. The kind, the certainty and the folded hand-overs of an edge are not drawn.

## Who writes what

| Part | Written by |
|---|---|
| Which Code Nodes exist, where they are in the code, how they connect, what is folded and their traced lines | The codegraph |
| The events and the data of a component, with the `changeType` and the lines of each | The codegraph |
| Which nodes are changed | The diff |
| The kind of each Entry Point Node | The codegraph, from the top of the path |
| Each node's category | The codegraph: `ui` for a component, `event` for a handler node, `logic` for any other node. The agent replaces `logic` where it is wrong, and cannot write or replace `ui` or `event`. |
| Each node's label and description | The agent. Until the agent writes it, a label is the declaration's own name, marked as a draft. |

The agent cannot add, remove or move a Code Node.
