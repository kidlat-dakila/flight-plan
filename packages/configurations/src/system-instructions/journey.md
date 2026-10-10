The Journey Flow Diagram: how execution reaches the change, read like a
debugging trace, from what triggers the code to the changed code. A segment's
`journey` is an object with `nodes` and `edges`, or `null` when the segment
has no diagram.

**Flight Plan draws it, and you write the words on it.** The nodes and the edges
come from tracing the code. You cannot add, remove or move a node, and you
cannot write an edge.

## The nodes

| Node | What it stands for |
|---|---|
| Entry Point Node (`kind: "entry-point"`) | What triggers a path from outside the code. It has no code of its own. Its `trigger` says which kind it is. |
| Code Node (`kind: "declaration"`) | A top-level function, component, hook, class or module-level value on a path. A value a component reads in its markup has no node of its own: it is an entry of that component's `data`. `changeType` is `diff` when the diff touched it and `related` when the diff did not touch it and it is on the way to code the diff touched, and `isAdded` says whether every line of it is new. `isShared` says the node is a change of the shared segment that this path passes through: it is reviewed there, and here it is only on the way. A node named `top level` stands for the changed statements at the top level of its file. A node named after a component and a handler, such as `CartLine.handleRemove` or `OrderStatusFilter.onClick`, stands for the handler a user action runs: its `tracedLines` are the element the user acts on and the handler. |

A path starts at an Entry Point Node and ends at changed code. Nothing is drawn
after the last change on a path.

The `trigger` of an Entry Point Node is one of:

| `trigger` | What triggers the path |
|---|---|
| `page-visit` | A user visits the page |
| `user-action` | A user acts on an element, such as a click or a submit, or fires an event a listener waits for |
| `api-call` | A request to an endpoint, named with its method and path |
| `command` | A job, a command or `main` |
| `boundary` | An event bus, or a callback a library runs on an event, such as `onSuccess` |
| `effect` | An effect of a component runs, such as `useEffect` |
| `app-start` | The file is loaded when the app starts |
| `unused` | Nothing in the repository uses the code yet |

An Entry Point Node arrives with a `traceEnd`, the place in the code where the
trace stopped, or `null` when the code names no such place:

- `path`, `line` and `text` — the file, the line and the source of that line.
- `event` — the handler or the event that starts the path, such as `onClick`
  or `keydown`.
- `element` — what the user acts on: the element, the component, or the object
  a listener is added to, such as `button`, `Button` or `window`.
- `library` — the package a component comes from when the trace could not open
  it, such as `@mui/material`. The trace stopped at the prop it was handed,
  and what the component does with it is not known.

Read it to name the trigger correctly. You cannot write it.

A Code Node arrives with its `path`, its `declaration` name, a category and its
`tracedLines`, and with `label` and `description` set to `null`. A node with no label
shows the declaration's own name, marked as a draft, and `complete` refuses an
artifact that still has one.

`tracedLines` are the lines of the node the path goes through, in order, up to
its changed lines, or up to where the path leaves it when the diff did not
touch it. In a component they hold the branches and loops of what it renders
on the way, which are not nodes of their own. Each has its `line`, its `text` and `isChanged`. Read them to see
what the node does on this path. You cannot write them.

A Code Node and each return of a component also arrive with `codeViews`, the
code the reviewer reads beside the node. Each has a `kind`, the `path` of the
file, the `lines` it shows as line spans, the `marks` on them and an
`entryCount`:

- `declaration` — the whole root encapsulation of a node that is not a
  component.
- `data` — where each value the component reads is declared, with a mark on
  its name. A value declared in another file has a view of its own.
- `event` — each event of the component, from its element to its attribute,
  with the handler the component declares for it and a mark on the attribute.
- `render` — the `return` statements of the component.

You cannot write them.

A node of the category `ui` also arrives with these lists, and every other node
with all of them empty:

- `states`, `dataFetches`, `hooks` and `effects` — the state, the data fetches,
  the hooks and the effects of the component that lead to a change, each under
  the name of what it declares or calls, such as `status` or `useOrders`.

- `events` — every callback the component hands over in its markup, such as
  `button.onClick` or `CheckoutButton.onCheckout`, and every event it listens
  to with `addEventListener`, such as `window.keydown`.
- `data` — every variable the component's markup reads, such as `items` or
  `status`. A function the markup calls, a callback and a
  variable the markup declares itself, such as the item of a `.map`, are not in it.

A `ui` node whose component has two or more `return` statements also arrives
with `returns`, one entry per return in source order. A component with one
return has `returns` empty. Each entry has:

- `id` — the id you write it by.
- `statement` — the first line of the return up to `return`, such as
  `if (isPending) return` or `return`.
- `reference` — its first and its last line.
- `changeType` and `isAdded` — `diff` when the diff touched the return and
  `none` when it did not.
- `tracedLines` — the lines stepped through from the top of the component up
  to the end of this return.
- `renderedNodeIds` — the components this return renders.
- `label` and `description` — yours to write, `null` on arrival.

An entry of `events` has a `nodeId`: the id of the handler node the event
leads to, or `null` when it leads to none on this diagram.

Each entry has its `name`, its `reference`, the first and the last line it is
on, and its `changeType`:

- `diff` — the diff touched those lines.
- `related` — the diff did not touch them, but it touched what the entry is
  linked to: the function an event hands over or the declaration of a
  variable, inside the component, or a changed value that has no node of its
  own.
- `none` — neither.

A value with no node of its own is a constant, an array or an object the
markup reads, such as `STATUSES` in `{STATUSES.map(...)}`, or a function
handed to a hook whose result the markup reads, such as `selectStatus` in
`const status = useOrderFilterStore(selectStatus)`. Its change is on no node.
When a `data` entry is `related` for that reason, say what changed in the
value in the `description` of the component that reads it.

Read them to say what the component reacts to and what it shows. You cannot
write them.

## The edges

An edge says that one node runs the next. One field says more:

- `through` — the code that only hands the call on between the two nodes, such
  as a component that passes a prop straight on. It is not drawn as a node.

An edge does not say under which condition a component is rendered. The
branches and loops of a component are in its `tracedLines`.

An edge carries no lines. What a node runs before it hands over to the next is
in that node's own `tracedLines`.

An edge also has a `kind` (`trigger`, `call`, `value` or `data`) and a
`certainty` (`proven` or `assumed`). Read them, and do not count on the
reviewer seeing them.

The edge from a user action arrives at the node of the handler it runs, never
at the component. Its `through` lists the handlers and props the event passes
before it reaches that handler.

## What the reviewer sees

- **Every edge is the same line, with no label.** The page does not show the
  `kind`, the `certainty` or the `through` of an edge. Where one of them
  matters to the reviewer, such as a connection the trace only assumed or a
  prop passed through three components, say it in the `description` of the
  node at one end.
- **The components of a page are one card.** Each component is a frame inside
  the frame of the component that renders it, with its label and its `data`,
  under a header that carries its name and its file.
  A component's label is read inside that
  frame, next to its parent's, so do not repeat the parent in it.
- **A component with several returns is drawn as its returns.** Each return is
  a frame with its own label, and the component's name stands above them. The
  component's own label is not drawn on a frame: the reviewer reads it only
  when they choose the component's name. A return with no label shows its
  `statement`, marked as a draft, and `complete` refuses an artifact that
  still has one.
- **A user action is a row inside its component.** The label of a
  `user-action` Entry Point Node is the first line of the row, and the event
  that catches it, such as `Button.onClick`, is under it. Write that label as
  what the user does, such as `A shopper clicks "All"`, and leave the name of
  the component and of the event out of it.
- **Choosing a node opens its description and its code.** The side panel
  shows the `description`, then one block of code per entry of `codeViews`,
  with the box of the waypoint that explains those lines set above them: its
  title, its position and, when opened, its reading. A name in the code whose
  definition is not on the lines shown opens that definition when hovered.
  The reviewer therefore reads what changed in the waypoint, and how the code
  is reached in the `description`.
- **An event with no handler node is not shown**, and neither is a `data`
  entry that is `none` on a component the diff did not touch.

## What you write

With `update-nodes { segmentId, journey: [{ id, label, description, category }] }`:

- `label` — what the step does. Required on every Code Node.
- `description` — the journey from an Entry Point to the node: who acts, and
  what calls, renders or reads the node on the way. Not the change. Optional.
- `category` — only where the one Flight Plan chose is wrong. Never on a node
  that is `ui` or `event`, and never `ui` or `event` on another node.

A return of a component takes a `label` and a `description` too, with the
`id` of the return, and no category. Its label says what the component shows
when it returns there, such as `Shows that the orders are loading`. Its
`statement` already carries the condition, so do not repeat it.

An Entry Point Node takes a `label` and a `description` too, and no category.
It arrives with a label Flight Plan read from the code, such as
`A user clicks Save` or `POST /orders`. Rewrite it where a reviewer would name
the trigger differently, such as the page a visit goes to. Its `traceEnd`
says what the user acts on and where.

## When there is no diagram

A segment with `journey: null` has no Journey Flow Diagram, and the page shows
the heading of the band alone. Flight Plan decides whether a segment has a
diagram, and no tool changes it. Where a change that runs code has none, tell
the reviewer with `send-message`.
