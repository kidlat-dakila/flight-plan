The Journey Flow Diagram: the path the change runs through, from what starts it
down to the changed code. A segment's `journey` is an object with `nodes` and
`edges`, or `null` with a `journeyAbsence` line saying why there is none.

**Flight Plan draws it, and you write the words on it.** The nodes and the edges
come from tracing the code. You cannot add, remove or move a node, and you
cannot write an edge.

## The nodes

| Node | What it stands for |
|---|---|
| Entry Point Node (`kind: "entry-point"`) | What starts the flow from outside the code: a person clicking a button, an HTTP request, a scheduled job. It has no code of its own. |
| Declaration node (`kind: "declaration"`) | A declaration on the path. `isChanged` says whether the diff touched it. One the diff touched is a Head Node; one it did not is a Tail Node, wherever it sits. |

A declaration node arrives with its `path`, its `declaration` name and a
category, and with `label` and `description` set to `null`. A node with no label
shows the declaration's own name, marked as a draft, and `complete` refuses an
artifact that still has one.

## What you write

With `update-nodes { journey: [{ id, label, description, category }] }`:

- `label` — what the step does. Required on every declaration node.
- `description` — how it does it and why it is on the path. Optional.
- `category` — only where the one Flight Plan chose is wrong.

An Entry Point Node takes a `label` and a `description` too, and no category.

## When there is no diagram

A segment with `journey: null` says why in `journeyAbsence`. Where that line is
not true of the change — two edits in one file, a version bump, a pure rename —
write the real reason with `update-document { journeyAbsence }`: one line a
reader can trust. It is refused on a segment that has a diagram.
