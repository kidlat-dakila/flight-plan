Write one or two sentences that start with "This segment", then one accordion
with up to three sections: "What's added", "What's modified" and "What's
removed".

```markdown
This segment checks the stock of every basket line before payment, so a basket
with an item that sold out a minute ago gets an error naming each sold-out item
and never reaches payment.

:::accordion
::section What's added
- [`findShortLines()`](code:src/stock/short-lines.ts#findShortLines): added a
  new function that reads every stock level in one
  [`getLevels()`](code:src/stock/short-lines.ts#L8) call and returns a
  [`ShortLine`](code:src/stock/short-lines.ts#L12) for each line whose
  [`quantity`](code:src/stock/short-lines.ts#L11) is above its level.
::section What's modified
- [`hasStock()`](code:src/stock/check.ts#hasStock): modified the function to
  report every short line at once.
  - Calls [`findShortLines()`](code:src/stock/check.ts#L14) in place of calling
    `checkLine()` once per line.
  - Throws an [`OutOfStockError`](code:src/stock/check.ts#L16) that lists every
    short line, in place of stopping at the first one.
- [`src/stock/index.ts`](code:src/stock/index.ts#L3): modified the barrel to
  export [`findShortLines`](code:src/stock/index.ts#L3) in place of
  `checkLine`.
::section What's removed
- `checkLine()`: removed the function that read the stock level of one basket
  line and returned `false` when it was short, together with its file
  `src/stock/legacy-check.ts`.
:::
```

Check every claim against the diff, never against the pull request's own
description.

### The opening sentences

Say what the segment's change does for a reader who has not seen the code. Name
no identifiers, paths or links here. Say what someone would see: "a query over
1 MB now gets an error that names the limit" tells the reader more than "the
size check handles large queries".

### Which code gets an item

Write about the files of this segment only. Code that lives in another segment
gets no item: name it and link it where this segment's code uses it.

Give an item to the main changes of each file: the functions, hooks,
components, pages and routes a reader would open. A type, props interface,
constant or query key that serves one of them gets no item of its own. Name it
inside the item of the code that uses it. A file that holds only types gets one
item, for its main type, and that item names the others.

### How an item is written

Every item has the same shape: the code, a colon, then a verb, the kind of code
and what it does.

- Added: `[`name`](code:path#name): added a new <kind> that <what it does>.`
- Modified: `[`name`](code:path#name): modified the <kind> to <what it does now>.`
- Removed: `` `name`: removed the <kind> that <what it did>. ``

The kind is what the code is: a function, a hook, a component, a page
component, a route config, a barrel or, for a types file, an interface or a
type. What it does is told in the code's own terms: the request it sends and to
which URL, the state it keeps, what it renders, what it returns, what it calls.
Name the methods, props, routes and values. Do not swap them for plain-language
wording.

When an item describes more than one thing the code does, its own line says in
one clause what the code is for, and each thing it does becomes a sub-item that
starts with a verb. An item that does one thing stays on one line. Sub-items go
one level deep and hold no list of their own.

A modified item says what the code did before when the reader needs that to see
the change. Code removed from inside a declaration that still exists belongs to
its modified item, not to What's removed.

### Code links inside an item

Only the item's leading link points at a declaration. Every other piece of code
the item names is a link to a line: a function call, a component, a prop, a
variable, a value, a URL, a route path or a string the code renders. The link
points at the line inside the item's own code where that code is used, never at
the line that defines it.

```markdown
- [`<ViewOrdersPage />`](code:src/routes/orders/index.tsx#ViewOrdersPage):
  added a new page component that lists every order.
  - Loads the orders with [`useOrders()`](code:src/routes/orders/index.tsx#L5).
```

Here `useOrders()` links to line 5 of `src/routes/orders/index.tsx`, where
`<ViewOrdersPage />` calls it, not to `src/hooks/use-orders.ts`, where it is
defined. A type or constant folded into an item links to the line that holds it.

Code that has no line in the new code stays in backticks without a link: code
the change deleted, and a word the code never writes, such as the `GET` method a
request uses by default. A removed item names its code this way, and says so
when its whole file is gone.

A change outside any declaration, such as an import or an export line, has no
name to lead with. Lead with the file, linked to its changed lines:
`[`path`](code:path#L3)` or `[`path`](code:path#L1-2)`.

### The accordion

The accordion opens with `:::accordion` on a line of its own and closes with `:::`
on a line of its own. Each section starts with `::section ` and its name on a
line of its own, and the section's list follows on the next lines, with no blank
line between.

Give a section to each list that has items, in this order: "What's added",
"What's modified", "What's removed". Leave out a section whose list has nothing
in it, and never write "None". Keep the items in the order the tour walks the
files.

A collapsed section names its items by the code each one leads with, so start
every item with its code, as the shapes above do.
