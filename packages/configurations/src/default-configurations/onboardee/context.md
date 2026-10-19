Write one or two sentences that start with "This segment" and say what the
segment's change does. That is the whole context. Flight Plan lists every piece
of code the segment adds, modifies and removes under it, in the Change Overview,
so the context holds no list of changes, no accordion and no code links.

```markdown
This segment checks the stock of every basket line before payment, so a basket
with an item that sold out a minute ago gets an error naming each sold-out item
and never reaches payment.
```

Check every claim against the diff, never against the pull request's own
description.

### What the sentences say

Say what the segment's change does for a reader who has not seen the code. Name
no identifiers, paths or links. Say what someone would see: "a query over 1 MB
now gets an error that names the limit" tells the reader more than "the size
check handles large queries".

Write about the files of this segment only. When the reviewer turned segments
off, the first segment's context is the one Context of the whole change: start
it with "This change" and say what the whole change does.
