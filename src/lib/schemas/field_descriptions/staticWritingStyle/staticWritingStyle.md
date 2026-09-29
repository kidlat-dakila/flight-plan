# Code links — the fixed format

This is part of the writing style that never changes and is always in force,
whatever the profile. Every profile writes code links this one way.

## The form

`[label](code:path#L<from>-<to>)`, wherever prose can go. Hovering shows those
lines; the excerpt is prepared when you write the link, not when the reader
hovers it.

**A link is a path and lines, and nothing else.** There is no symbol form: a
name resolved by a language server has no version to belong to. A link that
names a symbol is refused, and the refusal says what to write instead.

| Written | Points at |
|---|---|
| `code:src/repo.ts#L95-96` | lines 95 to 96 |
| `code:src/repo.ts#L95` | one line |
| `code:src/repo.ts` | the whole file |

`#L95-L96` is accepted as well as `#L95-96`, and a reversed range is put the
right way round. The fragment is taken from the **last** `#`, so a path may
contain one.

**A path containing `(`, `)`, `[`, `]` or a space goes in pointy brackets.** A
bare link destination ends at the first `)`, so Markdown cuts the path in half
and the link names a file that does not exist:

```
[the page](code:app/(checkout)/page.tsx#L1-2)     ✗ path stops at `(checkout`
[the page](<code:app/(checkout)/page.tsx#L1-2>)   ✓
[the cap](<code:src/a b.ts#L4>)                        ✓ a space, the same way
```

Route groups and dynamic segments (`[orderId]`) put brackets in a path. Percent-
escaping the brackets works as well; a backslash does not, and is read as part
of the path.

## Which version the lines are

**The diff first, then the mainline.** A path the change touches is read on the
branch, because the branch is what the document is about. Every other path is
read at `origin/main`, because that is the version the reader has. A plan has no
diff: it resolves against the working tree it splices into.

## The label is the anchor

The label is what makes a line number in the middle of a sentence safe. The
anchor is the first backticked run in the label, up to its first identifier:
`` [`addToBasket({ id: 7 })`](…) `` anchors on `addToBasket`. A label in
plain prose anchors on nothing — right for the one place that happens, a trace
step naming a user action.

## Link the claim, not the word

**A link covers the whole claim it evidences** — the verb and what it acts on,
ending where the claim ends. A link on one word answers for one word.

> **Before** — `readRepoFile()` reads a file and returns its text, or a reason
> it could not.
>
> **After** — [`readRepoFile()`](code:src/repo.ts#L28-46)
> [reads a file](code:src/repo.ts#L31) and
> [returns its text](code:src/repo.ts#L44), or
> [a reason it could not](code:src/repo.ts#L38-41).

- **Every claim is linked**, not the first one and not the interesting one. A
  claim left bare tells the reader it is not worth checking.
- **A waypoint's reading is the exception: it links only code outside its own
  card.** The panel already shows the card's lines, so a link to them points at
  what the reader is looking at. It names that code in backticks, and links
  every mention of code elsewhere — the caller, the consumer, the other half of
  the change.
- **One claim, one link.** Two links inside one clause means the clause is two
  claims and should be two.
- **The label stops at the claim.** It does not swallow the `and`, the `or` or
  the conjunction into the next claim, and it never runs to the full stop out of
  convenience.
- **Put code in the label wherever the claim names code.** `` [returns
  `{ reason }` instead of throwing](…) `` beats "[returns a reason instead of
  throwing](…)": the backticked identifier is the only thing that repairs the
  range when the file moves.
- **A claim about code that does not exist yet carries no link.** A plan's
  proposal has nothing to point at, and neither does a "nothing changes"
  scenario or a trace step naming a user action.
- **Never `[[double brackets]]`.** They are not a link here and render as literal brackets.
