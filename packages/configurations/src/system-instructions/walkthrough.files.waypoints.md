The waypoints of one File Section, in reading order: an array of waypoint
objects, nested through `children`. Each is one stop on the tour: an explanation
of one piece of the change, placed on top of its lines.

## A waypoint

```json
{
  "id": "w3",
  "title": "Modified `hasStock()` to check every line against one stock read",
  "declaration": "hasStock",
  "reading": "The author replaced the per-line stock lookup in `hasStock()` with one query for the whole basket, and it now returns every line that falls short, not the first. [`placeOrder()`](code:src/checkout/placeOrder.ts#placeOrder) calls it before it charges the card, so that a customer sees every short item in one refusal.",
  "needsAttention": "This is the rule the pull request exists for: stock is now checked against one read for the whole basket, and the other waypoints wire it in.",
  "findings": [],
  "children": []
}
```

- **`id`** is how every tool addresses the waypoint. Flight Plan assigns it.
- **`declaration`** is the code the waypoint is about: a declaration's name, or
  a name for its lines where no single declaration holds them ("Lines 3–9").
  Flight Plan sets it from the diff, with the lines it covers.
- **`title`** and **`reading`** are yours, and arrive empty. `nodes` hands you
  each waypoint that still needs one, with the code it covers.
- **`needsAttention`** and **`findings`** are yours, and most waypoints carry
  neither.

**The structure is not yours to change.** Flight Plan makes one waypoint per
piece of the change: several changed blocks inside one declaration are one
waypoint about that declaration, and a block that touches no declaration, or
several, is one waypoint about its own lines. You cannot add, remove, split or
merge a waypoint. If a section reads repetitively, say so to the reviewer.

**You write no source links for a waypoint.** The code beside it and its diff
marks come from Flight Plan.

### Children

A waypoint may hold `children`: waypoints nested inside it, for a large
declaration read in parts. The parent says what the author did across the whole
declaration, and each child says what one block inside it does. Children are
written by id like any other waypoint.
