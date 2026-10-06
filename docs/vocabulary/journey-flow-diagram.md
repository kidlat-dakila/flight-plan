# Journey Flow Diagram

## Definition

The Journey Flow Diagram shows the path a change runs through, from what starts it down to the changed code. It answers the reviewer's first question about any change: when does this code run, and what leads to it?

It is drawn from the [codegraph](codegraph.md) turned the other way up. The codegraph starts at the change and climbs to its callers; the Journey Flow Diagram starts at the top and reads downward, in the order the code runs:

```text
Entry Point Nodes → Tail Nodes → Head Nodes
```

## Nodes

| Node | What it stands for | How many |
|---|---|---|
| **Entry Point Node** | What starts the flow from outside the code: a person clicking a button, an HTTP request, a scheduled job, a message on a queue. It has no code of its own. It connects to the declaration that handles it, which is the codegraph's entry point. | One or more |
| **Tail Node** | A declaration on the path from an entry point to the change that the diff did not touch: the codegraph's callers, from the entry point's handler down. | One or more |
| **Head Node** | A declaration the diff changed. | One or more |

Whether a declaration is a Head Node or a Tail Node depends only on the diff, never on where it sits in the chain. A declaration that contains changes from the diff is a Head Node. A declaration without changes is a Tail Node, wherever it appears.

A diagram can have several Entry Point Nodes, because a change can be reached from several places, and several Tail Nodes, because the paths from those places differ.

It can also have several Head Nodes. The codegraph merges changes that lie on the same chain into one tree (see [codegraph](codegraph.md#core-logic), "Join the pieces"), so one diagram can hold several changed declarations. The Head Node furthest from the entry points is where the paths end, and it is the codegraph's root. The other Head Nodes sit along the path, between Tail Nodes. Changes on chains that do not connect get separate diagrams.

For example, a pull request changes `priceOf` and `checkout`, and `checkout` reaches `priceOf` through `subtotal`. Both changes are on one chain, so they share a diagram:

```text
Customer clicks Checkout      Entry Point Node
└── CheckoutButton            Tail Node
    └── checkout              Head Node
        └── subtotal          Tail Node
            └── priceOf       Head Node, where the path ends
```

## Node categories

Each node that stands for code has a visual category, chosen by one test: would a reviewer scanning the board want this told apart at a glance?

| Category | Code |
|---|---|
| `guard` | A validator, gate, permission check or schema check: code whose job is to refuse |
| `logic` | A function or method that transforms. The default. |
| `data` | A query, repository, migration or cache access |
| `type` | An interface, type alias, schema or enum |
| `ui` | A component, view or template |
| `config` | A constant, flag, environment setting or build setting |

## Edges

An edge joins two nodes in the order they run. It carries the codegraph connection's kind and certainty:

- A **call** edge: the upper node calls or renders the lower one.
- A **value** edge, drawn differently from a call: the function was handed over as a value (through a prop, a hook or a callback) and runs at the lower node.
- A **data** edge: the lower node uses a value produced from the upper node's function.

An edge from the Entry Point Node to its handler has no kind: it is the trigger, not code.

## What the diagram draws

The codegraph delivers the whole trace, and the diagram always draws the same part of it:

- every level of Tail Nodes above the Head Nodes;
- every edge the codegraph marked as assumed;
- no data edges.

The reviewer has no control over this.

## Who writes what

| Part | Written by |
|---|---|
| Which nodes exist, where they are in the code, and how they connect | The codegraph |
| Which node holds the change | The diff |
| The Entry Point Node: what starts the flow | The agent, attached to the handler the codegraph found |
| Each node's label, category and description | The agent. Until the agent writes it, a label is the declaration's own name, marked as a draft. |
| A line saying why the change has no flow, when it has none | Flight Plan |

The agent cannot add, remove or move a node that stands for code.
