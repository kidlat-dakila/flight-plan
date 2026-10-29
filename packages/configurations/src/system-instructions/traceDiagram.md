The Trace Diagram: how execution reaches the change, read like a
debugging trace, from the code that starts a path to the changed code. A
segment's `traceDiagram` is an object with a `title`, a `description`, `nodes` and `edges`, or
`null` when the segment has no diagram.

**Flight Plan draws it, and you write the words on it.** The nodes and the edges
come from tracing the code. You cannot add, remove or move a node, and you
cannot write an edge.

## The nodes

A node stands for one unit of code on a path: code that runs on an occasion
of its own. Its `type` says which, with the type of that block.

- **A top-level block**: a function, a component, a hook, a class or a value
  at the top level of a file. Types such as `function`, `component`, `hook`,
  `class`, `root-variable`, `state`.
- **A block inside a component that something triggers**: an event
  (`render-event`, `code-event`), an effect (`component-effect`, `effect`)
  such as `useEffect`, Vue `watch`, `watchEffect` or `onMounted`, a memo
  such as `useMemo`, `useCallback` or Vue `computed`, whose type is the type
  of the value it is kept in, such as `derived`, and a callback another hook
  runs (`effect-callback`). The callback of an effect or a memo is part of
  its node. An arrow function written in place of an event or a callback is
  part of that event's node, and so is a function the event is handed by
  name, such as `submit` in `onSubmit={submit}`.
- **An operation a library declares inside one value**: each procedure of a
  tRPC router (`resolver`) and each action of a Zustand store (`function`),
  named after the key it is written under, such as `list` or `addItem`.

Every other top-level block is one node, whatever is written inside it: an
effect, a callback or an event inside a function, a hook, a class or a value
is a row of that node. Everything else inside a top-level block is no node
of its own either. On a class, a route, a router or a store, a function, a
method, a condition or a loop is a step of the node it is written in: a row,
with a line to each node of another top-level block it runs. On a function
card the rows are its calls, its returns and its throws instead, and a call
row has a line to the node it calls. On a component the rows are its props,
its state, its calls, its memos, its effects, its triggers and what it
renders. What only produces the markup of a component, its declarations, its
state and its markup, is part of the component's node. A component rendering
is one unit.

A node inside a component, a router or a store is not drawn inside it. It is a node
beside it, with an edge from the node around it, and its `parentId` is
`null`. Its first `codeBlockId` says where it is written.

You read the nodes as a flat list. Every node is one entry, at any depth, and
no entry carries the nodes inside it:

- `id` — the id you write it by.
- `parentId` — the id of the node this one is drawn inside, or `null`. A
  component that another component renders is drawn inside that component,
  so the components of a page are one node on the page with the others inside
  it.
- `type` — the type of the block the node stands for.
- `label` and `description` — yours to write, `null` on arrival.
- `codeBlockIds` — the blocks of the node the path goes through, the block
  the node stands for first. An id names its file, its type and where it
  starts, such as `src/cart/CartLine.tsx#render-event@12:15`. A block that
  is a node of its own is listed in the node around it and no deeper: what
  is inside it is in its own node.
- `diffCodeBlockIds` — the blocks among them the diff touched. A node with
  none is only on the way to a change.
- `triggerLabels` — the events and the data fetches of the node that are on a
  path: each has the `codeBlockId` of its block and a `label` that is yours to
  write, `null` on arrival. An event is also a node of its own, with the same
  id as that `codeBlockId`: write the trigger label as what the user does,
  and the node's `label` as what the handler does.

- `blockLabels` — the rows of the node that carry a label. Each has the
  `codeBlockId` of its block, an `at` on some, a `kind` and a `name` that say
  what the row is and the name of its code, and a `label` that is yours to
  write, `null` on arrival. A row is written by its `codeBlockId` and its
  `at` together: several rows can share one `codeBlockId` and differ by `at`
  alone.

  A **function card** is the node of a `function`, a `method`, a `hook`, an
  event (`render-event`, `code-event`) or an `effect-callback`, including one
  that returns a function. The card of an effect or a memo is labelled the
  same way. You label two kinds of its rows:

  - **A call** (`kind: "call"`), one per call into code of the repository: a
    function, a hook, a class, a method of another class, a function that
    another call returned, or a function handed in as a parameter. Its `at`
    is the `{ line, column }` where the name of the callee starts, and its
    `name` is the call, such as `load_trainers()`. Two calls in one statement
    are two rows. A call into a library or a built-in has no row.
  - **A return or a raise**: one row per `return` statement (`kind:
    "return"`, its `at` where the statement starts, its `name` `return`) and
    one per `throw` or `raise` (`kind: "throw"`, with no `at`, its `name` the
    start of the statement, such as `raise ValueError`). The block of a
    return is often the function itself.

  The arguments of a function card are drawn by their code and take no
  label, and neither does a function it returns, which is a node of its own.
  The dependencies and the outside variables of an effect or a memo take no
  label either. A cleanup an effect returns is its return row.

  A **component card** is the node of a `component`. You label four kinds of
  its rows:

  - **A call** (`kind: "call"`), as on a function card, a hook of the
    repository such as `useTrainer` included.
  - **A memo or an effect** (`kind: "memo"`, `kind: "effect"`), one per
    memo and one per effect of the component, by the `codeBlockId` of its
    block and with no `at`. Its `name` is its code, such as
    `teamTypes = useMemo()` or `useEffect()`. Each has a node of its own
    beside the component, labelled like a function card.
  - **A return** (`kind: "return"`), one per `return` of the component,
    early or last, `return null` included. Its `at` is where the statement
    starts, and its `name` the start of what it returns, such as
    `return <section>` or `return null`. A component written as an arrow
    body or as a Vue template has one return, by the `codeBlockId` of its
    `render-root` and with no `at`, named `=> <li>` or `<template>`.
  - **A render row**, inside a return, in the order it is written: markup
    that renders only sometimes (`kind: "condition"`, such as `{… && <p>}`
    or `<p v-if>`), markup rendered for each item of a list (`kind: "loop"`,
    such as `badges.map()`), a component of the repository (`kind:
    "component"`, named `<TeamSlot />`, or after the condition or the loop
    around it, which has no row of its own then), all with no `at`, and
    markup another function of the repository draws (`kind: "value"`, such
    as `{renderBadges()}`, with the `at` where it is written). A component of
    a library and a plain element have no row: the label of their return
    covers them.

  The props and the state of a component are drawn by their code and take
  no label.

  On **any other card**, a class, a route, a router or a store, the rows are
  its arguments, its state, its hooks, its effects, its calls into other
  code and its steps, none with an `at`. Write what the value holds or what
  the step does, not the name of the code. A step is a statement with all
  that is written inside it, and the statements that follow each other are
  one step, listed by the block of the first: read the code of the node from
  that block down to the next step before you write it.

`nodes { ids }` returns a node with the name of its code, its lines and the
nodes it is inside of. Read the code before you write its words.

A path starts at a node nothing leads to and ends at changed code. Nothing is
drawn after the last change on a path. There is no node for what starts a path
from outside the code: a click, a page visit or a request is said in the
words you write, on the node or on the trigger label it starts at.

## The edges

An edge has a `from` and a `to`, each the id of a node: the first runs the
second, by calling it, rendering it or running a function handed to it, or
the second is written inside the first and runs on an occasion of its own,
as an event or an effect of a component and a procedure of a router do. An edge says
nothing else. It does not say under which condition a component is
rendered, and it does not say whether the connection is proven or assumed.

## What the reviewer sees

- **The title names the flow.** When the diagram is the only one on the
  page it is the heading of the section, and when there are several it is
  the label of the diagram's tab.
- **The description is read first.** It is shown above the board: the
  caption of the diagram, in five sentences at most. Until it is written
  the page says so.
- **Every edge is the same line, with no label.** Where something about a
  connection matters to the reviewer, such as a prop passed through three
  components, say it in the `description` of the node at one end.
- **A node inside another is drawn inside it.** A component's label is read
  inside the frame of the component that renders it, so do not repeat the
  parent in it. No line is drawn between the two.
- **A trigger label is a row of its node.** It shows your label and, under
  it, the name of the code, such as `button.onClick`. A line runs from the
  row to the node of that event.
- **A function card lists its rows under four headings.** Arguments shows
  the code of each parameter. Calls holds one small card per callee, named
  after the function, the hook, the class or the parameter it calls, with
  one row per call in the order they are written. Triggers lists its trigger
  labels. Returns and raises lists each return and each throw in the order
  they are written. A function the node returns is drawn inside it, below
  its rows. Each labelled row shows your label and, under it, the name of the
  code, such as `load_trainers()` or `return`, so the rows of one card are
  read as a sequence.
- **A component card lists its rows under seven headings.** Props shows the code
  of each prop, and State each state with the value it starts with. External
  calls holds one small card per callee, as on a function card. Memos and
  Effects list one row each, with a line to the node of that memo or effect
  beside the component. Triggers lists its trigger labels. Renders holds one
  group per return, in the order they are written, headed by the return's
  label, with its render rows under it. A component row holds the node of
  the component it renders. Each labelled row shows your label and, under
  it, the name of the code, such as `return <section>` or `{… && <p>}`.
- **An effect or a memo card lists its rows under four headings.**
  Dependencies shows the dependencies as written, Outside variables each
  variable it reads from outside with what it is, such as a constant, a
  state or a prop, and External calls and Returns and raises are labelled
  as on a function card.
- **A class, a route, a router or a store lists its arguments, state, hooks,
  effects, calls and steps as rows**, each a block label: your label, and
  under it the name of the code. It lists its arguments and then every row in
  the order it is written, so its labels are read as a sequence.
- **A row of a block that is a node of its own has a line to that node**, and
  so does a call row to the node it calls.
- **The diagram is read from left to right.** A node is one column after the
  last node that leads to it, level with the row that leads to it.
- **A node with no label shows the name of its code**, marked as a draft, and
  so do a trigger label and a block label. `complete` refuses an artifact that still has one.
- **Choosing a node opens its description and its code.** The side panel
  shows the `description`, then the code of the node, with the box of the
  waypoint that explains those lines set above them. The reviewer therefore
  reads what changed in the waypoint, and how the code is reached in the
  `description`.

## What you write

With `update-nodes { segmentId, traceDiagram: [{ id, label, description, triggerLabels, blockLabels }] }`:

- `label` — what the step does. Required on every node.
- `description` — how the node is reached and what it runs next. Not the
  change. Optional.
- `triggerLabels` — `[{ codeBlockId, label }]`, one entry per trigger label
  you write. Required on every trigger label of the node.
- `blockLabels` — `[{ codeBlockId, at, label }]`, one entry per block label
  you write, with the `at` the block label has, as `{ line, column }`. Leave
  `at` out on a block label that has none. Required on every block label of
  the node.

A node inside another is written by its own `id`, like any other.

With `update-nodes { segmentId, traceDiagramTitle, traceDiagramDescription }`:

- `traceDiagramTitle` — the name of the flow the diagram shows, in a few
  words. Required on every segment that has a diagram. See
  `traceDiagram.title`.
- `traceDiagramDescription` — the caption of the diagram, in five sentences at
  most. Required on every segment that has a diagram. See
  `traceDiagram.description`.

## When there is no diagram

A segment with `trace: null` has no Trace Diagram, and the page shows
the heading of the band alone. Flight Plan decides whether a segment has a
diagram, and no tool changes it. Where a change that runs code has none, tell
the reviewer with `send-message`.
