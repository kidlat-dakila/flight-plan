What is wrong with the code this waypoint shows: an array of finding objects,
one per distinct claim. Empty on most waypoints. Writing it replaces the
waypoint's whole list, so send every finding the waypoint should keep.

Each is an `id` unique in the artifact, a `kind` (`bug`, `risk`, `nit` or
`question`, most severe first), a `title`, a `reading`, an optional `trace` of
steps that prove it, and a `solution` — required on a `bug`, a `risk` and a
`nit` in a finished artifact, refused on a `question`.

A finding names no code of its own: its lines are the lines of the waypoint it
hangs on. A `solution` is a string of code and nothing else — it replaces the
lines the waypoint covers, so it names no path and no position, and the reviewer
can preview it against the real file.

The waypoint draws one chip, the highest kind among them.

## Where a finding lives

**A finding lives on the waypoint it is about.** The waypoint that shows the
code carries the claim about it, so a reviewer meets the two together. An
artifact has no list of findings outside its waypoints. Write them with
`update-nodes { waypoints: [{ id, findings }] }`.

Something that belongs to no waypoint — "no tests were added", "this pull
request does two unrelated things" — is not a finding. Say it in the context, or
tell the reviewer with `send-message`.

```json
{
  "id": "finding-negative-reserved",
  "kind": "bug",
  "title": "`hasStock()` reads a negative hold as extra stock",
  "reading": "[The filter subtracts `reserved` without checking its sign](code:src/checkout/hasStock.ts#L155). A cancelled hold writes `-1`, which [the subtraction turns into one more unit than exists](code:src/checkout/hasStock.ts#L155-157).",
  "trace": [
    "A customer cancels a held order, and the sweeper writes `reserved = -1`.",
    "[`handleCreateOrder(request)`](code:src/api/orders.ts#handleCreateOrder) passes the basket to the stock check.",
    "[`const available = 4 - -1`](code:src/checkout/hasStock.ts#L155) → `5`."
  ],
  "solution": "  const available = level - Math.max(reserved, 0)"
}
```

**The kind is a field, not a bracket in the title.** Flight Plan draws it as a
coloured chip. There is no colour to write anywhere.

**A waypoint shows one chip, the highest kind it carries.** A waypoint with a
bug and a nit reads as a bug, because the bug is why anybody would stop. So a
nit reported on the same waypoint as a bug is easy to miss — report it where it
belongs.

**Order most severe first**: `bug` → `risk` → `nit` → `question`.

**Exactly one kind per finding**, and what each one means is the entry of
`walkthrough.files.waypoints.findings.kind`.

**Which fields each kind carries**

| kind | reading | trace | solution |
|---|---|---|---|
| `bug` | yes | yes | required |
| `risk` | yes | yes | required |
| `nit` | yes | no | required |
| `question` | yes | refused | refused |

"Required" is checked by `complete`. A write without one lands, so a finding can
be reported first and fixed second.

A trace carries the proof and nothing else — no `Impact`, no `Evidence`, no
`Proposal` step.

## Prove a bug before you report it

**A `bug` is not reported until it is proven.** An unverified bug claim on a
review page reads as fact and sends the author chasing something that may not
exist. If you cannot prove it, **it is a `risk`**, and the reading says in one
sentence what stopped you. Dropping it is also an answer.

**The tools here surface the change, and a finding is a claim about the
repository.** A guard you think is unreachable, a caller you think breaks, a
value you think is never `null` — none of those can be settled from a diff. Read
the files the change never touched.

**Climb the ladder cheapest first, and stop at the rung that proves it.**

1. **Trace the whole path** and cite the `file:line` chain.
2. **Run the affected tests** with the project's own test command.
3. **Reproduce in an ephemeral worktree** under the session scratchpad — never
   the reviewer's working tree, which may carry uncommitted changes — and remove
   it afterwards with `git worktree remove … --force`.
4. **Drive it through the project's own integration harness** for anything
   touching a database or a route, rather than a setup you wrote for the
   occasion.

**A risk is a latent path, so proving one means showing it is reachable**: the
caller exists and the guard is absent. Not that it has already fired.

## The solution

**A solution replaces the lines of the waypoint the finding is on.** It is one
string of code: no path and no position, because the waypoint is the position.

**The reviewer can preview it.** The page splices the solution into the real
file and shows it as a diff. That is the whole reason a solution is scoped this
way: it lands in one known range in one known file.

**Every `bug`, `risk` and `nit` carries one**, and `complete` refuses an
artifact where one does not. The finding already names the lines and says what
is wrong with them; leaving the fix out hands the reader the half of the work
you had already done.

**The solution replaces every line the waypoint covers**, so write them whole,
with their indentation. If the fix needs more than these lines, write the part
that belongs to them and name the other lines that must change in the reading,
with `code:` links.

**No solution on a `question`** — a fix attached to one is a suggestion wearing
a question's chip.
