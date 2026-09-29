The waypoints of one file section, in reading order: an array of waypoint
objects, nested recursively through `children`. Each has an `id`, a `title`, and
a `reading`, plus optional `needsAttention`, `findings`, `code` and `children`.

## A waypoint

```json
{
  "id": "stock-guard",
  "title": "Modified `hasStock()` to check every line against one stock read",
  "reading": "The author replaced the per-line stock lookup in `hasStock()` with one query for the whole basket, and it now returns every line that falls short, not the first. [`placeOrder()`](code:src/checkout/placeOrder.ts#L22-40) calls it before it charges the card, so that a customer sees every short item in one refusal.",
  "needsAttention": "This is the rule the pull request exists for: stock is now checked against one read for the whole basket, and the other cards wire it in.",
  "code": {
    "kind": "ref",
    "lang": "ts",
    "path": "src/checkout/hasStock.ts",
    "target": { "symbol": "hasStock" }
  },
  "children": [ … ]
}
```

- **`id`** is what a diagram node binds to. Lowercase, hyphenated, stable.
- **`target`** names a symbol. Use `{ "focus": [from, to] }` only where no
  declaration names the code — a few lines inside a function, a config entry, a
  language nothing can parse.
- **`covers`** names which hunks of this file's diff the waypoint explains, as
  indices counting from 0 in file order. A parent covers nothing; each child
  covers its own block.

**One idea per waypoint.** One that needs three files is three waypoints.

**Cover the whole change.** Every hunk maps to a waypoint, and anything left out
on purpose — a generated file, a lockfile, a pure rename — is said out loud.

**You write no source links.** Flight Plan builds the link to the diff and puts
it on the code panel.

### Breaking a waypoint down

**This is the expected shape, not an occasional option.** A change to one
function usually touches two or three places inside it, and one card describing
all of them is where a walkthrough stops being one.

- A top-level waypoint is **one body** — one function, one class, one interface.
  Its `target` is that body, and it covers nothing.
- Each child says what **one logic block** inside the body does, and covers that
  block's hunk.
- **A child keeps the parent's `target`.** It does not narrow to its own block:
  the range focuses, and a child that focused two lines would take away the
  context the breakdown exists to provide. The highlight moves; the panel does
  not re-window.
- **Two children or none, never one.** A parent with a single child is a flat
  waypoint written across two cards, and the schema refuses it.
- **As deep as the code nests.** A block that is itself a body — a nested
  function, a method, a named callback — takes children of its own, repeating
  its grandparent's `target` and moving only its `covers`. Three levels is as
  deep as this goes in practice.

**A logic block is one thing the code does**, not one hunk and not one line. A
guard clause and the work it protects are two. Two guard clauses added for the
same reason are one. If you cannot write a distinct reason for a candidate
block, it belongs in its neighbour.

```json
{
  "id": "refuse-binary",
  "title": "Modified the file reader to return a reason for binary content",
  "reading": "The author made `readRepoFile()` read bytes and test them before anything decodes them. A binary file now comes back as a reason instead of garbled text, so that [the code panel](code:src/ui/CodePanel.tsx#L60-72) says why it cannot show the file.",
  "code": { "kind": "ref", "lang": "ts", "path": "src/repo.ts", "target": { "symbol": "readRepoFile" } },
  "children": [
    {
      "id": "drop-binary",
      "title": "Added a filter that drops a binary buffer",
      "reading": "The author added [`isProbablyText()`](code:src/repo.ts#L18-23), which returns false when the first eight kilobytes hold a NUL byte. `readRepoFile()` calls it before it decodes, so that a binary file never reaches the decoder.",
      "code": { "kind": "ref", "lang": "ts", "path": "src/repo.ts", "target": { "symbol": "readRepoFile" }, "covers": [0] }
    },
    {
      "id": "return-a-reason",
      "title": "Returned a reason instead of throwing",
      "reading": "The author made this branch return a reason instead of throwing, so that [the code panel](code:src/ui/CodePanel.tsx#L60-72) shows the reason as the content of the code block, not an error.",
      "code": { "kind": "ref", "lang": "ts", "path": "src/repo.ts", "target": { "symbol": "readRepoFile" }, "covers": [1] }
    }
  ]
}
```

Depth follows the code and nothing else, which is what makes it checkable — the
reader sees the nesting in the rail and finds it in the file:

```
Modified checkDiagram() to read nodes that hold nodes           ← the body
  Added a record of each node's own children                    ← a block
  Added walk(), which reads a node and then the ones inside it  ← a body
    Added the parse that reports a bad node instead of dropping it  ← a block
    Added the recursion over each child, in written order        ← a block
  Added a warning for a node with no edges                      ← a block
```

