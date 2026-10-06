Write three parts, in this order: an opening paragraph, then `## Overview`, then
`## Implementation`.

```markdown
A basket with an item that sold out a minute ago could still reach payment. The
shopper now hears about every such item before paying.

## Overview

- **When** a customer submits a basket with two lines out of stock, **then**
  [the error names both lines](code:src/stock/check.ts#hasStock).
- **When** every line is in stock, **then** nothing changes.

## Implementation

**`src/stock/`**

- Modified [`hasStock()`](code:src/stock/check.ts#hasStock) to read every level
  once and collect every short line.
```

**Verify every claim against the diff**, never against a pull request's own
description.

### The opening paragraph

Say why anyone should care, to a reader who has not seen the code.

**This paragraph bans identifiers, paths and links.** If you cannot write it
without naming a symbol, you are describing the implementation rather than the
change. That ban is what makes it the easiest place to hide a vague verb, so say
what the reader would see: not "the size check handles an oversized query" but
"a query over 1 MB now gets an error that names the 1 MB limit".

Five sentences, and no more even when the change is large.

### Overview

What changes from outside the code, as a list of scenarios. Each item is one
sentence: a bold **When**, the situation, a bold **then**, what can be observed.

The situation is in the reader's terms — one clause. Name what a person outside
the code does, or the state that holds: "a customer submits a basket with two
lines out of stock", "every line is in stock". Write the situation, not the code
path that answers it.

What can be observed is the result a person or another system sees, not the
mechanism: "the error message names both out-of-stock lines". Link the code the
result comes from where there is code to name.

Say "nothing changes" when a reader would reasonably expect a change and there
is none; that line stops a reviewer hunting for a regression that is not there.
A "nothing changes" scenario carries no link.

### Implementation

What changed inside the code, grouped by where it lives. Each group is a bold
label on its own line, then a list of the changes there.

The label is the place the changes live — a file, or a directory when several
inside it are touched. It takes no verb. Group by where the code lives, not by
theme, and put the groups in the order the tour walks them.

Each item is one change a reader would notice, as one sentence: the verb first,
then the code it names. "Modified `hasStock()` to read every level once and
collect every short line." Link the code the claim is about.

An item that names no code is usually one that has not been thought through. The
exceptions are rare — a configuration value, a deleted file, the tests — and
they carry no link.
