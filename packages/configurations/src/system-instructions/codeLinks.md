# Code links — the fixed format

This is the part of the writing style that never changes and is always in
force, whatever the configuration. Every configuration writes code links this
one way.

## The form

`[label](code:path#target)`, wherever prose can go. Hovering shows the code it
points at, and clicking opens it. There are two targets:

| Written | Points at | Use |
|---|---|---|
| `code:src/auth/user.ts#getUser` | the declaration `getUser` in that file | The form to use. It names what the sentence already says. |
| `code:src/auth/user.ts#L300-320` | lines 300 to 320 | For code no declaration names: a few lines inside a function, a config entry. |
| `code:src/auth/user.ts#L300` | one line | |

The target is taken from the **last** `#`. A reversed range is put the right way
round. There is no whole-file form: a link always names a declaration or lines.

## What a link can point at

**A link resolves inside the files the artifact holds, and nowhere else.**
`read { section: "overview" }` returns `sources`: every file the artifact holds,
each with the names of the declarations a link can name. A declaration target
must be one of those names, spelled as listed. A lines target must lie inside
the file.

**A link that does not resolve is refused, and nothing in that call is
written.** The refusal names the link. Fix it, or name the code in backticks
with its path where the file is not one the artifact holds.

A path that contains `(`, `)` or a space cannot be written as a link. Name that
code in backticks with its path.

## Link the claim, not the word

**A link covers the whole claim it evidences** — the verb and what it acts on,
ending where the claim ends. A link on one word answers for one word.

> **Before** — `readRepoFile()` reads a file and returns its text, or a reason
> it could not.
>
> **After** — [`readRepoFile()`](code:src/repo.ts#readRepoFile)
> [reads a file](code:src/repo.ts#L31) and
> [returns its text](code:src/repo.ts#L44), or
> [a reason it could not](code:src/repo.ts#L38-41).

- **Every claim about linkable code is linked**, not the first one and not the
  interesting one. A claim left bare tells the reader it is not worth checking.
- **A waypoint's reading is the exception: it links only code outside its own
  waypoint.** The code beside it already shows the waypoint's lines, so a link
  to them points at what the reader is looking at. It names that code in
  backticks, and links every mention of code elsewhere — the caller, the
  consumer, the other half of the change.
- **One claim, one link.** Two links inside one clause means the clause is two
  claims and should be two.
- **The label stops at the claim.** It does not swallow the `and`, the `or` or
  the conjunction into the next claim, and it never runs to the full stop out of
  convenience.
- **Put code in the label wherever the claim names code.** `` [returns
  `{ reason }` instead of throwing](…) `` beats "[returns a reason instead of
  throwing](…)".
- **A claim about something that is not code carries no link**: a "nothing
  changes" scenario, or a trace step naming a user action.
- **Never `[[double brackets]]`.** They are not a link here and render as
  literal brackets.
