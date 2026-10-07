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
| **Code Node** | An encapsulation on a path: a top-level function, component, hook, class or module-level value. It is never a single line. The one Code Node that is not an encapsulation is the top level of a file, see "Changes outside any encapsulation". |

A Code Node has no role such as head or tail. It carries one fact from the diff: it is **changed** or it is not. A change can sit anywhere on a path, and a path can hold several.

## Entry points

The Entry Point Node is named after what sits at the top of the path:

| The top of the path | Entry Point Node |
|---|---|
| A page or route component that nothing renders | A user visits the page |
| A handler on a built-in element, such as `onClick` or `onSubmit` | A user action |
| A route handler, such as `POST` or `GET` | An API call |
| A job, a command or `main` | That job or command |
| A boundary the trace cannot cross, such as a store, a context or an event bus | Reached through that boundary |
| An export that nothing uses | Not used yet |
| The top level of a file | The app starts |

When the changed function is handed to a hook or another higher-order function, the code around it does not say when it runs. The trace then follows what the hook returns to where that is used, and takes the entry point from there: a result called from a handler on a built-in element is a user action, and a result read in the render body is a page visit.

## How the diagram is built

1. **Start at every change.** Each encapsulation that holds a changed line is a changed Code Node. Several changed lines inside one encapsulation are one node.
2. **Climb to what triggers it.** From each changed encapsulation, the trace follows what uses it, then what uses that, until nothing does.
3. **Name the trigger.** The top of each path gets its Entry Point Node from the table above.
4. **Merge the paths.** An encapsulation appears once, however many paths cross it. Every path is drawn, however many there are. Changes that are connected share a diagram, and changes that are not connected get separate diagrams.
5. **Fold what only forwards.** See below.
6. **Add the call stacks.** See below.

Because every change is a starting point, a diff that adds a function and also wires it in draws the wiring: the code that calls the function and the code that uses its results are changed too, so each is on a path of its own.

## Changes outside any encapsulation

A changed line at the top level of a file belongs to no encapsulation. What happens to it depends on what it is:

| The changed line | In the diagram |
|---|---|
| An import | No node. When the imported name matters, its use is changed too, inside an encapsulation, and that is traced. |
| A type or an interface | No node. Nothing that runs is different. |
| A bare statement, such as `app.use(rateLimit())`, `initAnalytics()` or a route registration like `router.post("/users", createUser)` | A Code Node for the top level of that file, marked as changed. Its frame is the changed statements. |

A module-level value such as `export const MAX_RETRIES = 5` is an encapsulation, so it is a Code Node like any other and the trace climbs from it to the code that reads it.

## Folding

An unchanged encapsulation that only forwards is not drawn as a node. Its hand-over becomes a step on the edge that passes through it. An encapsulation only forwards when it does one of:

- passes a prop straight on: `<SaveButton onSave={onSave} />`
- re-exports a name
- wraps a call and nothing else: `(user) => addUser(user)`

A changed encapsulation is always drawn, even when it only forwards.

## Call stack

A Code Node carries a call stack for each node that points to it, as a debugger would show it when execution reaches the node. A node with three parents has three call stacks.

A call stack has two frames:

1. **The frame of the parent**: the lines of the parent that run, in order, up to the line that hands over to the node.
2. **The frame of the node**: the lines of the node that run, in order, up to its changed lines. For a node the diff did not touch, they run up to where the path leaves it for the next node.

A call stack stops at the parent. It does not go on to what points to the parent: that is the parent's own call stack. A node an Entry Point Node triggers has one call stack, named after that entry point, with its own frame alone.

When the entry point is a user action, that frame is only what the action runs: the element the user acts on, and the handler declared in the component that the element names. The lines the component runs when it renders are the frame of a visit, not of a click, so two buttons of one component have two different frames.

A frame lists lines of the source, with their line numbers, and marks the lines the diff touched:

- A statement on the way is listed with every line it spans, so a `return (` shows the whole element it returns.
- A branch or a loop the path does not go into is listed by its first line only, without its body.
- A function declared inside the node is listed by its first line, and its body follows only when the path goes through it.
- An element is a unit like a statement. A frame steps into the elements above the hand-over, lists the elements rendered before it, and stops at it: the elements after it and the closing tags are left out.
- Nothing that runs after the hand-over, or after the changed lines, is listed.

## Rendering logic

In a component, what is rendered is part of the trace. A component often renders one thing or another depending on a condition, or renders something once per item of a list, and the diagram shows that.

- **An edge to a rendered component carries the condition it is rendered under.** When the render sits inside a conditional or a loop, the edge is labelled with it: "if there is no user", "for each user".
- **A branch that renders only built-in elements is lines of a frame, not a node.** A warning written in place as `<p>No users yet</p>` belongs to the component that renders it. It appears in that component's frame, under the conditional it sits in.

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
[A user visits /home] → Home ──────────────────────→ UserList (changed)
                            └─ if there is no user ─→ EmptyWarning (changed)
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
[A user submits the form] ─→ UserForm (changed)
```

Compare with example 1: the code is the same, and `UserForm` is drawn here only because it is changed. It is one node reached by two paths: `Page` renders it, and the submit runs its handler.

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
[A user clicks Delete] → UsersPage → removeUser (changed)
```

When both are changed, both paths are in one diagram and `UsersPage` is one node.

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
[A user clicks the button] → UserForm ─────────────────→ addUser (changed)
                                      through Page.handleSubmit
```

`Page` adds nothing a reviewer needs to read. Two nodes instead of three.

### 10. A prop drilled through several components

**Shows:** every forwarder on the way is folded, however many there are. The component that holds the element the user acts on stays, because it is what the entry point triggers.

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
[A user clicks Save] → SaveButton ──────────────────────────→ saveReview (changed)
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
[A user clicks Save] → SaveButton ──→ Editor (changed) ──→ saveReview (changed)
                                                      through ReviewPage
```

`Editor` is drawn because it is changed. `ReviewPage` is still folded.

### 12. A rendering branch written in place

**Shows:** a branch that renders only built-in elements has no component to be a node. It is lines in the frame of the component that renders it.

```tsx
// home.tsx
const Home = () => {
  const users = useUsers()

  if (users.length === 0) {
    return <p className="warning">No users yet</p>    // diff
  }

  return <UserList users={users} />
}
```

```text
[A user visits /home] → Home (changed)
```

The frame of `Home`:

```text
3    const users = useUsers()
5    if (users.length === 0) {
6      return <p className="warning">No users yet</p>     changed
```

The `<UserList>` branch is not listed. The change is not inside it. The example under "Rendering logic" is the other case, where each branch renders a component and the condition is a label on the edge.

### 13. A call stack in detail

**Shows:** which lines a call stack lists. The parent's frame runs up to the hand-over, the node's own frame up to its changed lines. Nothing after.

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

The call stack of `createUser` has two frames, because `postUser` points to it:

| Frame | Lines | Left out |
|---|---|---|
| `postUser`, the parent | `const input = await request.json()`, then `if (!input.email) {` without its body, then `const user = await createUser(input)` | The body of the `if`, since the path does not go into it. `return created(user)`, since it runs after the hand-over to `createUser`. |
| `createUser`, the node | `const user = parseUser(input)`, then `if (await exists(user.email)) {` without its body, then `await sendWelcome(user)` marked as changed | The `throw`, since the change is not inside that branch. `return save(user)`, since it runs after the change. |

The call stack of `postUser` has one frame, its own, under the entry point `POST /users`. What triggers `postUser` is not a node with lines.

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

### 16. A boundary the trace cannot cross

**Shows:** when the climb ends at a boundary, the boundary is the entry point. The path is never dropped.

```tsx
// app.tsx
const App = () => (
  <SaveContext.Provider value={saveReview}>
    <ReviewPage />
  </SaveContext.Provider>
)

// reviews.ts
const saveReview = () => {                            // diff
  ...
}
```

```text
[Reached through a context] → App → saveReview (changed)
```

Whoever reads the context runs `saveReview`, and the trace cannot tell who that is.

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
    await fetch("/api/users", { method: "POST", body: JSON.stringify(user) })   // diff
  }

  return <UserForm onSubmit={handleAdd} />
}

// routes/users.ts
router.post("/api/users", createUser)

// createUser.ts
const createUser = async (request) => {               // diff
  ...
}
```

```text
Diagram 1:  [A user submits the form] → UsersPage (changed)
Diagram 2:  [POST /api/users]         → createUser (changed)
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
[A user clicks Delete] → UsersPage → removeUser (changed)
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

The frame of the node: `app.use(rateLimit({ perMinute: 60 }))`, marked as changed.

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
| `ui` | A component, view or template |
| `config` | A constant, flag, environment setting or build setting |

## Edges

An edge joins two nodes in the order the code runs:

- From an **Entry Point Node** to a **Code Node**: the trigger. It is not code.
- Between two **Code Nodes**: the left one runs the right one, by calling it, rendering it or running a function handed to it. The hand-overs of any folded encapsulations are listed on the edge.

## Who writes what

| Part | Written by |
|---|---|
| Which Code Nodes exist, where they are in the code, how they connect, what is folded and their call stacks | The codegraph |
| Which nodes are changed | The diff |
| The kind of each Entry Point Node | The codegraph, from the top of the path |
| Each node's label, category and description | The agent. Until the agent writes it, a label is the declaration's own name, marked as a draft. |

The agent cannot add, remove or move a Code Node.
