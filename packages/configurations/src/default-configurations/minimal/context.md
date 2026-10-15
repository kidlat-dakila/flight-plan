Two parts, this order: one or two sentences starting "This segment", then one
accordion with up to three sections: "What's added", "What's modified", "What's
removed".

```markdown
This segment checks stock of every basket line before payment. A basket with an
item sold out a minute ago gets an error naming each one.

:::accordion
::section What's added
- [`findShortLines()`](code:src/stock/short-lines.ts#findShortLines): added a
  new function that reads every level in one
  [`getLevels()`](code:src/stock/short-lines.ts#L8) call and returns a
  [`ShortLine`](code:src/stock/short-lines.ts#L12) per short line.
::section What's modified
- [`hasStock()`](code:src/stock/check.ts#hasStock): modified the function to
  report every short line at once.
  - Calls [`findShortLines()`](code:src/stock/check.ts#L14), not `checkLine()`
    per line.
  - Throws an [`OutOfStockError`](code:src/stock/check.ts#L16) listing every
    short line.
::section What's removed
- `checkLine()`: removed the function that checked one basket line, with its
  file `src/stock/legacy-check.ts`.
:::
```

**Verify every claim against the diff.** Never against the pull request's own
description.

### Opening sentences

What the segment's change does. Reader has not seen the code.

**No identifiers, no paths, no links here.** Say what the reader would see: not
"size check handles oversized query" but "query over 1 MB now gets error naming
1 MB limit".

### Which code gets an item

- **This segment only.** Code in another segment gets no item: name and link it
  where this segment's code uses it.
- **Main changes only**: functions, hooks, components, pages, routes a reader
  would open. A type, props interface, constant or query key serving one of
  them: no item, named inside the item that uses it.
- **Types file**: one item, for its main type, naming the others.

### Item shape

Code, colon, verb, kind, what it does.

- Added: `[`name`](code:path#name): added a new <kind> that <what it does>.`
- Modified: `[`name`](code:path#name): modified the <kind> to <what it does now>.`
- Removed: `` `name`: removed the <kind> that <what it did>. ``

- **Kind**: function, hook, component, page component, route config, barrel; for
  a types file, interface or type.
- **What it does**: the code's own terms. Request and URL, state kept, what it
  renders, returns, calls. Methods, props, routes, values by name. No
  plain-language swaps.
- **Several things**: item line says in one clause what the code is for; each
  thing it does is a sub-item, verb first. One thing: one line. Sub-items one
  level deep, no list inside.
- **Modified**: what it did before, when the reader needs it. Code removed from
  inside a declaration that stays: in its modified item, not in What's removed.

### Code links

- **Leading link**: points at the declaration. Every other code named is a link
  to a line: call, component, prop, variable, value, URL, route path, rendered
  string.
- **The line where the item's code uses it**, never where it is defined. In the
  item of `<ViewOrdersPage />`, "Loads the orders with `useOrders()`" links
  `useOrders()` to the line where `<ViewOrdersPage />` calls it, not to
  `src/hooks/use-orders.ts`.
- **Folded type or constant**: links to the line that holds it.
- **No line in the new code**: backticks, no link. Deleted code, and words the
  code never writes, such as a request's default `GET`. Removed item says so
  when its whole file is gone.
- **Change outside any declaration**, such as an import or export line: lead
  with the file, linked to its changed lines: `[`path`](code:path#L3)`.

### The accordion

- `:::accordion` on its own line opens it; `:::` on its own line closes it.
- `::section ` and the name on its own line starts a section. Its list follows
  on the next lines, no blank line between.
- One section per list with items, in this order: "What's added", "What's
  modified", "What's removed". Empty list: no section. Never "None". Items in
  the order the tour walks the files.
- A collapsed section names its items by the code each one leads with: start
  every item with its code.
