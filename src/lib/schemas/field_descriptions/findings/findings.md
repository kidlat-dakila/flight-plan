What the change gets wrong or leaves in doubt: an array of finding objects,
most severe first. Each has an `id`, a `kind`, a `title`, and a `reading`, plus
an optional `trace` and `code`, and a `solution` wherever the finding has lines
to fix. Omit the field entirely when there is nothing to report.

**A finding lives on the waypoint it is about.** The card that shows the code
carries the claim about it, so a reviewer meets the two together rather than
reading the whole tour and then a list at the end. Write them with
`update-nodes { findings }`, by waypoint id.

**The document keeps a top-level list as well**, for what belongs to no card —
"no tests were added", "this pull request does two unrelated things". Write
those with `update-document { findings }`. If a finding is about a particular
piece of code, it goes on that code's card; the top-level list is for the ones
that are not.

A document with nothing to report omits both.

```json
{
  "id": "finding-negative-reserved",
  "kind": "bug",
  "title": "`hasStock()` reads a negative hold as extra stock",
  "reading": "[The filter subtracts `reserved` without checking its sign](code:src/checkout/hasStock.ts#L155). A cancelled hold writes `-1`, which [the subtraction turns into one more unit than exists](code:src/checkout/hasStock.ts#L155-157).",
  "trace": [
    "A customer cancels a held order, and the sweeper writes `reserved = -1`.",
    "[`handleCreateOrder(request)`](code:src/api/orders.ts#L6-18) passes the basket to the stock check.",
    "[`const available = 4 - -1`](code:src/checkout/hasStock.ts#L155) → `5`."
  ],
  "solution": { "lang": "ts", "body": "  const available = level - Math.max(reserved, 0)" }
}
```

**A finding on a waypoint carries no `code`.** Its lines are the lines of the
card it hangs on, which is what stops one card carrying two references that have
to agree. A top-level finding does carry one, because it has no card.

**The kind is a field, not a bracket in the title.** Flight Plan draws it as a
coloured chip — red for a bug, yellow for a risk, green for a nit, blue for a
question — and the card's marks are drawn in the same colour. There is no colour
to write anywhere.

**A card shows one chip, the highest kind it carries.** A card with a bug and a
nit reads as a bug, because the bug is why anybody would stop. The list inside
the card says how many. So a nit reported on the same card as a bug is easy to
miss — report it where it belongs.

**Order most severe first**, and within one kind by position in the file, so a
reviewer reads top-down by severity and stops when they stop caring:

`bug` → `risk` → `nit` → `question`

**Exactly one kind per finding**, and what each one means — when a claim is a
`bug` rather than a `risk`, what counts as a `nit` — is the `kind` field's own
entry. What follows belongs to the list rather than to any one field: which
fields each kind may carry, and how a bug is proven.

**Which fields each kind carries**

| kind | reading | trace | solution |
|---|---|---|---|
| `bug` | yes | yes | required |
| `risk` | yes | yes | required |
| `nit` | yes | no | required |
| `question` | yes | refused | refused |

"Required" holds wherever the finding has existing lines to replace. A finding
with none — on a card with no code or a proposal, or a document finding whose
`code` is `null` — carries no solution, and says the fix in its reading.

A trace carries the proof and nothing else — no `Impact`, no `Evidence`, no
`Proposal` step. A step asserting why it happens would either duplicate the
trace or contradict it.

## Prove a bug before you report it

**A `bug` is not reported until it is proven.** An unverified bug claim on a
review page reads as fact and sends the author chasing something that may not
exist. If you cannot prove it, **it is a `risk` **, and the reading says in one
sentence what stopped you. Dropping it is also an answer.

**Climb the ladder cheapest first, and stop at the rung that proves it.**

1. **Trace the whole path** and cite the `file:line` chain.
2. **Run the affected tests** with the project's own test command.
3. **Reproduce in an ephemeral worktree** under the session scratchpad — never
   the reader's working tree, which may carry uncommitted changes — and remove
   it afterwards with `git worktree remove … --force`.
4. **Drive it through the project's own integration harness** for anything
   touching a database or a route, rather than a setup you wrote for the
   occasion.

**A risk is a latent path, so proving one means showing it is reachable**: the
caller exists and the guard is absent. Not that it has already fired.

## The suggested solution

**A solution replaces the lines the finding is about.** On a waypoint's
finding those are the card's lines; on a document finding, the lines its own
`code` names. It is `{ lang, body }` and nothing else: no path and no position,
because the card, or the finding's `code`, is the position.

```json
"solution": { "lang": "ts", "body": "  const available = level - Math.max(reserved, 0)" }
```

**The reader can preview it.** The panel has a *Preview fix* toggle that splices
the body into the real file and shows it as a diff — proposed lines `+`,
superseded lines `-`. That is the whole reason a solution is scoped this way: it
lands in one known range in one known file, so there is nothing to reconcile
between what the card shows and what the fix changes.

**Every `bug`, `risk` and `nit` carries one**, and `complete` refuses a
document where one does not. The finding already names the lines and says what
is wrong with them; leaving the fix out hands the reader the half of the work
you had already done.

**The body replaces every line the range covers**, so write them whole, with
their indentation. If the fix needs more than these lines, write the part that
belongs to them and name the other lines that must change in the reading, with
`code:` links.

**No solution on a `question`**, which the schema enforces — a fix attached to
one is a suggestion wearing a question's chip.

**A walkthrough proposes code nowhere else.** A proposal fence is a plan's
business; a suggested fix is a solution's body.
