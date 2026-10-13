Three parts, this order: opening paragraph, `## Overview`, `## Implementation`.

```markdown
Basket with item sold out a minute ago still reached payment. Shopper now told
of every such item before paying.

## Overview

- **When** customer submits basket with two lines out of stock, **then**
  [error names both lines](code:src/stock/check.ts#hasStock).
- **When** every line in stock, **then** nothing changes.

## Implementation

**`src/stock/`**

- Modified [`hasStock()`](code:src/stock/check.ts#hasStock): reads every level
  once, collects every short line.
```

**Verify every claim against the diff.** Never against the pull request's own
description.

### Opening paragraph

Why anyone should care. Reader has not seen the code.

**No identifiers, no paths, no links here.** Cannot write it without a symbol:
you describe implementation, not the change. Say what the reader would see: not
"size check handles oversized query" but "query over 1 MB now gets error naming
1 MB limit".

Three fragments at most, even for a large change.

### Overview

What changes from outside the code. List of scenarios. One line each: bold
**When**, situation, bold **then**, what can be observed.

- **Situation**: reader's terms, one clause. What a person outside the code
  does, or the state that holds. Not the code path.
- **Observed**: result a person or another system sees. Not mechanism. Link the
  code the result comes from.
- **"nothing changes"**: where a reader would expect a change and there is
  none. No link.

### Implementation

What changed inside the code, grouped by where it lives. Each group: bold label
on its own line, then list.

- **Label**: file, or directory when several files inside change. No verb. Group
  by place, not theme. Groups in the order the tour walks them.
- **Item**: one change a reader would notice. Verb first, then the code:
  "Modified `hasStock()`: reads every level once, collects every short line."
  Link the code.
- Item naming no code: only for a configuration value, a deleted file, the
  tests. No link.
