The code diagram board: an object with a `type` of `"code"`, an optional
`title`, and an optional `nodes` array holding the call stack and execution
trace. Every document carries one, above the waypoints, or says why it does not
with `{ "absent": "<one line>" }` — a reader who cannot see the shape of the
work before walking through it has to hold it in their head instead.

**A diagram is a call stack and an execution trace, together.** Across the whole
change it follows the calls; inside a function it follows the steps. A board
that answers only the first is a map of file names.

**It draws the call stack, not the changed files.** It starts where a person or
a system does something and follows the calls to the change, including every
step on the way that the change never touches:

```
[A customer submits the checkout form] → placeOrder() → POST /orders → hasStock()
```

The value is the part the diff cannot show: what calls this, and what called
that.

How to write a label, a sublabel or a description is the field's own
instruction; what each node type and edge variant means is the field's own
description. What follows is what goes on the board at all.

## How a board is entered

**There is no `entries` array, and there has not been one for some time.** An
entry point is an ordinary node that nothing else calls — the leftmost card in
the chain — and the scaffold finds it by climbing callers until nobody calls
what it reached. Nothing is written by hand, and nothing is refused for being
missing.

What a reader gains from knowing *why* the code runs now lives in prose rather
than in a field: say it in the entry node's `label` and `description`, and in
the `## Context` section above the board.

**A test is never on the board.** Nothing in the running system calls the suite,
so a test card claims a step that never runs. Flight Plan reports a node
pointing at a test path by reading the path.

## What is a node

**A node is a step that runs. If it does not execute, it is not a node.**

This is the rule most boards break, and they break it the same way: the author
lists what the change *touched* instead of tracing what *happens*. Keep these
out, whatever the diff says about them:

- a barrel or index that only re-exports
- an interface, type alias or enum declaration
- a constant, a flag, or a member added to a union
- an import

Nothing arrives at a type declaration and continues somewhere else, so a node
for one has no honest edge in or out — and drawing one forces an edge that lies,
usually labelled "imports" or "uses". They still belong in the document: a new
type is worth a waypoint, and every change belongs in `implementation`. The
diagram is the one place that is only about the path.

**Test a node by asking what calls it and what it calls next.** If either answer
is "nothing, it is just there", it is not a node.

**A function a waypoint breaks down is broken down here too.** A node for the
function, and beneath it a node per execution step inside it, in the order they
run — the map shows the same structure the tour does.

## The two axes

*What calls what* runs **across**, one function per column, left to right into
the change. *What happens inside one function* runs **down**, its steps under
the card they are part of. An `if`/`else` forks into two arms side by side,
each carrying on until it rejoins or ends:

```
  [A customer submits] ──▶ Posts the basket ──▶ Throws on a line ──▶ Fetches the levels
                                                out of stock           levelsFor()
                                                       │
                                        ┌──────────────┴──────────────┐
                                 Reads every line            Returns the line
                                 in one query                that is short
                                        │
                                 Compares against
                                 what is reserved
```

A board that only goes across is a list of function names; one that only goes
down is a ladder whose top and bottom a reader cannot see at once.

**The two axes are two fields, so the shape is the JSON.** Neither says where a
card goes: they say what the relationship is, and the axis follows.

- **`children`** are the steps inside this node, drawn **below** it. A sequence
  is a chain of single children; a fork is two children of the same node.
- **`edges`** are the calls out of this node, drawn **across** to the next
  column. Each names only a `target`, because the node it sits on is the source.

```json
{ "id": "gate", "type": "guard", "label": "Throws when a line is out of stock",
  "edges": [{ "target": "levels", "label": "one read", "variant": "emphasis" }],
  "children": [
    { "id": "read", "…": "…", "children": [{ "id": "compare", "…": "…" }] },
    { "id": "deny", "…": "…" }
  ] }
```

`read` and `deny` are the two arms of the branch, under `gate`; `levels` is a
different function, in the column to the right. There is no `edges` array at the
bottom of the fence to keep in step with the nodes, and a `children` list cannot
name a node that does not exist.

**Any node may call any node.** A step deep inside one function is usually what
calls the next one, and writing that call on the step rather than on the
function it belongs to is what makes the board a trace: the arrow leaves the
line that makes the call.

**Write an edge to your own child only to label it.** It replaces the plain edge
the nesting would have drawn rather than adding a second one, and the child
stays a child. A fork takes one such edge per arm.

## Edge variants

**What each variant means is the `variant` field's own description.** The rule
that belongs to the board rather than the field: they are **rationed**. An edge takes only one, most boards use none, and
`emphasis` is at most one per board — reserved for the single edge the change is
about, and left off entirely when the change is inside the nodes rather than
between them. A board where several edges shout has no emphasis at all.

## Steps inside a function

**A step's `sublabel` is the function it is inside**, repeated on every step of
it. The repetition is what says these cards are one function rather than four.

**Only where the tour goes.** A function nobody walks through is one node. Steps
are worth drawing where a reader has to follow *how* the function reaches its
result — a branch, a guard, a loop, an early return — and not where it does one
thing in a straight line.

**Each step is still a step that runs**, so a declaration or a constant is not
one of them.

## What every node carries

**Which fields a node takes and how to fill each one — `label`, `sublabel`,
`description`, `type`, `changed`, `sources`, `edges` — is each field's own
entry**, including what the six node types mean. What follows is what belongs to
the board rather than to any one field.

**A node has no `waypoint` field.** It once bound a node to the waypoint that
explained it; that binding was removed, and a node is reached by clicking it.

**No node carries layout.** There is no `row`, `col`, `pos` or `size`: the board
describes the graph and the renderer computes the geometry.

**At most three `sources` per node.** A fourth is dropped with a warning rather
than refusing the node.

## What the renderer does with it

- **A card draws `label` and `sublabel` only.** Detail belongs in `description`,
  shown on hover.
- **Let the board lay itself out** unless the automatic layout gets it wrong.
- **Every id is unique across the whole tree**, because every edge target
  resolves in one namespace. An edge naming an id that is nowhere in the tree is
  dropped and reported.

## When there is no flow to draw

A change with genuinely none — two edits in one file, a version bump, a pure
rename — still answers the question:
`{ "absent": "Two edits in one file; there is no flow to draw." }` An absent
section is only a question; one line saying why is something a reader can trust.
