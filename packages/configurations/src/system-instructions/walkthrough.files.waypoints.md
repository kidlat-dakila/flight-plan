The waypoints of one File Section, in reading order: an array of waypoint
objects, nested through `children`. Each is one stop on the tour: an explanation
of one piece of the change, placed on top of its lines.

## A waypoint

```json
{
  "id": "w3",
  "title": "Modified `hasStock()` to check every line against one stock read",
  "declaration": "hasStock",
  "codeBlockIds": ["src/checkout/hasStock.ts#function@12:1", "src/checkout/hasStock.ts#condition@15:3"],
  "reading": "The author replaced the per-line stock lookup in `hasStock()` with one query for the whole basket, and it now returns every line that falls short, not the first. [`placeOrder()`](code:src/checkout/placeOrder.ts#placeOrder) calls it before it charges the card, so that a customer sees every short item in one refusal.",
  "needsAttention": "This is the rule the pull request exists for: stock is now checked against one read for the whole basket, and the other waypoints wire it in.",
  "findings": [],
  "children": []
}
```

- **`id`** is how every tool addresses the waypoint. Flight Plan assigns it. A
  child has the id of its parent and its place: `w3.2`.
- **`declaration`** is the code the waypoint is about: a declaration's name, or
  a name for its lines where no single declaration holds them ("Lines 3–9").
  Flight Plan sets it from the diff, with the lines it covers.
- **`codeBlockIds`** are the blocks of the waypoint: the block it stops at
  first, then the changed blocks inside it, in the order they are written. An
  id names its file, its type and where it starts, as the `codeBlockIds` of a
  Trace Diagram node do, so the same id is the same block. Flight Plan
  sets them, and a waypoint in a file it does not trace has none.
- **`title`** and **`reading`** are yours, and arrive empty. `nodes` hands you
  each waypoint that still needs one, with the code it covers.
- **`needsAttention`** and **`findings`** are yours, and most waypoints carry
  neither.

**The structure is not yours to change.** Flight Plan makes one waypoint per
piece of the change: a changed declaration is one waypoint about that
declaration, with a child for each changed step inside it when there are two
or more, and a block that touches no declaration, or several, is one waypoint
about its own lines. You cannot add, remove, split or
merge a waypoint. If a section reads repetitively, say so to the reviewer.

**You write no source links for a waypoint.** The code beside it and its diff
marks come from Flight Plan.

### Children

A waypoint may hold `children`: waypoints nested inside it, for a declaration
read in parts. The parent says what the author did across the whole
declaration, and each child says what one changed step inside it does. A step
is a statement with all that is written inside it, several statements that
follow each other, a condition, a loop, a call, or an expression inside the
markup of a component. Its `declaration` names its parent and the step, such
as `renameUser › Condition :4`, and `nodes` hands you the lines it covers. Do
not repeat the parent in a child: say what this step does. Children are
written by id like any other waypoint.
