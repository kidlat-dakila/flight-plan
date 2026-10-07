The Journey Flow Diagram: how execution reaches the change, read like a
debugging trace, from what triggers the code to the changed code. A segment's
`journey` is an object with `nodes` and `edges`, or `null` with a
`journeyAbsence` line saying why there is none.

**Flight Plan draws it, and you write the words on it.** The nodes and the edges
come from tracing the code. You cannot add, remove or move a node, and you
cannot write an edge.

## The nodes

| Node | What it stands for |
|---|---|
| Entry Point Node (`kind: "entry-point"`) | What triggers a path from outside the code. It has no code of its own. Its `trigger` says which kind it is. |
| Code Node (`kind: "declaration"`) | A top-level function, component, hook, class or module-level value on a path. `isChanged` says whether the diff touched it, and `isAdded` whether every line of it is new. A node named `top level` stands for the changed statements at the top level of its file. |

A path starts at an Entry Point Node and ends at changed code. Nothing is drawn
after the last change on a path.

The `trigger` of an Entry Point Node is one of:

| `trigger` | What triggers the path |
|---|---|
| `page-visit` | A user visits the page |
| `user-action` | A user acts on an element, such as a click or a submit |
| `api-call` | A request to an endpoint, named with its method and path |
| `command` | A job, a command or `main` |
| `boundary` | A context or an event bus the trace cannot cross |
| `app-start` | The file is loaded when the app starts |
| `unused` | Nothing in the repository uses the code yet |

A Code Node arrives with its `path`, its `declaration` name, a category and its
`frameLines`, and with `label` and `description` set to `null`. A node with no label
shows the declaration's own name, marked as a draft, and `complete` refuses an
artifact that still has one.

`frameLines` are the lines of the node a debugger would step through, in order,
up to its changed lines, or up to where the path leaves it when the diff did
not touch it. Each has its `line`, its `text` and `isChanged`. Read them to see
what the node does on this path. You cannot write them.

## The edges

An edge says that one node runs the next. Two fields say more:

- `through` — the code that only hands the call on between the two nodes, such
  as a component that passes a prop straight on. It is not drawn as a node.
- `condition` — the condition a component is rendered under, such as
  `if users.length === 0` or `for each of users`.
- `frameLines` — the lines of the node the edge starts from, stepped up to the
  line that hands over to the next node. With the next node's own `frameLines`
  they are its call stack from that parent. On the edge from a user action
  they are the element the user acts on and the handler it runs.

## What you write

With `update-nodes { segmentId, journey: [{ id, label, description, category }] }`:

- `label` — what the step does. Required on every Code Node.
- `description` — how it does it and why it is on the path. Optional.
- `category` — only where the one Flight Plan chose is wrong.

An Entry Point Node takes a `label` and a `description` too, and no category.
It arrives with a label Flight Plan read from the code, such as
`A user clicks Save` or `POST /orders`. Rewrite it where a reviewer would name
the trigger differently, such as the page a visit goes to.

## When there is no diagram

A segment with `journey: null` says why in `journeyAbsence`. Flight Plan decides
whether a segment has a diagram and writes that line, and no tool changes
either. Where the line is not true of the change, tell the reviewer with
`send-message`.
