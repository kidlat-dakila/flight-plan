The Journey Flow Diagram: how execution reaches the change, read like a
debugging trace, from the code that starts a path to the changed code. A
segment's `journey` is an object with `nodes` and `edges`, or `null` when the
segment has no diagram.

**Flight Plan draws it, and you write the words on it.** The nodes and the edges
come from tracing the code. You cannot add, remove or move a node, and you
cannot write an edge.

## The nodes

A node stands for one unit of code on a path: code that runs on an occasion
of its own. Its `type` says which, with the type of that block.

- **A top-level block**: a function, a component, a hook, a class or a value
  at the top level of a file. Types such as `function`, `component`, `hook`,
  `class`, `root-variable`, `state`.
- **A block inside one that something triggers**: an event (`render-event`,
  `code-event`), an effect (`component-effect`, `effect`) and a callback
  (`effect-callback`). An arrow function written in place of an event or a
  callback is part of that event's node.

Everything else inside a top-level block is no node of its own. A function,
a method, a condition or a loop is a step of the node it is written in: a
row, with a line to each node of another top-level block it runs. What only
produces the markup of a component, its declarations, its state and its
markup, is part of the component's node. A component rendering is one unit.

A node inside a function or a component is not drawn inside it. It is a node
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

- `blockLabels` — the arguments, the state, the hooks, the effects and the
  steps of the node that are drawn as rows: each has the `codeBlockId` of its
  block and a `label` that is yours to write, `null` on arrival. Write what
  the value holds or what the step does, not the name of the code. A step
  is a statement with all that is written inside it, and the statements
  that follow each other are one step, listed by the block of the first:
  read the code of the node from that block down to the next step before
  you write it.

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
as an event or an effect of a component does. An edge says
nothing else. It does not say under which condition a component is
rendered, and it does not say whether the connection is proven or assumed.

## What the reviewer sees

- **Every edge is the same line, with no label.** Where something about a
  connection matters to the reviewer, such as a prop passed through three
  components, say it in the `description` of the node at one end.
- **A node inside another is drawn inside it.** A component's label is read
  inside the frame of the component that renders it, so do not repeat the
  parent in it. No line is drawn between the two.
- **A trigger label is a row of its node.** It shows your label and, under
  it, the name of the code, such as `button.onClick`. A line runs from the
  row to the node of that event.
- **A node also lists its arguments, state, hooks, effects and steps as
  rows**, each a block label: your label, and under it the name of the code.
  A row of a block that is a node of its own has a line to that node.
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

With `update-nodes { segmentId, journey: [{ id, label, description, triggerLabels, blockLabels }] }`:

- `label` — what the step does. Required on every node.
- `description` — how the node is reached and what it runs next. Not the
  change. Optional.
- `triggerLabels` — `[{ codeBlockId, label }]`, one entry per trigger label
  you write. Required on every trigger label of the node.
- `blockLabels` — `[{ codeBlockId, label }]`, one entry per block label
  you write. Required on every block label of the node.

A node inside another is written by its own `id`, like any other.

## When there is no diagram

A segment with `journey: null` has no Journey Flow Diagram, and the page shows
the heading of the band alone. Flight Plan decides whether a segment has a
diagram, and no tool changes it. Where a change that runs code has none, tell
the reviewer with `send-message`.
