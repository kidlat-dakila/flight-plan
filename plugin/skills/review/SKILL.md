---
name: review
description: Use when reviewing a pull request with Flight Plan: writing the walkthrough for it, or refreshing one that has gone out of date. Scaffolds the structure from the diff, hands you the change and the list of what is unwritten, asks the reader how they want it organised, then fills in the prose that only a reader of the code can write.
---

# Generate a pull request walkthrough

Write a guided reading order for a pull request, so a reviewer follows the
change the way it actually works rather than the way the diff happens to be
sorted.

**Store it under the name the change actually has.** `start` takes `repo` and
then either `pr` for a pull request number or `branch` for a branch, and refuses
both together. A walkthrough filed under the wrong one cannot be found again by
the panel that has to open it.

**`start` returns a `plan` reference, and every other call takes it.** One
string instead of the repository and the change repeated on every call:

```
review:acme/storefront#412 a pull request
review:acme/storefront@release/4.2 a branch
```

Keep it from the `start` response and pass it unchanged. You can write one
yourself when resuming a walkthrough you did not start in this session — the
form is stable — but do not compose one from parts you have not checked.

**Everything about the format comes from `get-instructions`** — the voice, the
document's shape, what a write is refused for, and how to write each field. This
plugin ships no reference files: there is one place a rule lives, and it is the
entry for the thing the rule is about.

## Reaching the reader

The reader works in Flight Plan's web app, not in your terminal. Two tools reach
them there, both named by the review target: `repositoryName` is the name
Flight Plan lists the repository under, and `targetId` is `pr-<number>` for a
pull request or `branch-<name>` for a branch. A wrong name is refused with the
names Flight Plan follows.

- `send-message` tells the reader something: a summary, a result, a reason.
- `ask-questions` asks one question or a batch. A question offers options to
  pick, or none for a free-text answer, and the reader can always write their
  own.

How the answer comes back depends on who started you. If Flight Plan started
your session, its system prompt says so: end your turn after asking, and you are
resumed with the answers. Otherwise the result of `ask-questions` gives a `curl`
command. Run it in the background; it exits when the reader replies, and its
output holds the reply and the command for the next one.

## The order of work

Six tools, in this order. Describing the change needs no `git`, `gh`, `rg` or
file read — if you are reaching for one of those to write a title, a reading, a
label or the overview, the answer is already in a call below.

**Verifying a finding is the exception, and it is a real one.** A finding claims
something about the repository, not about the diff, and the tools here surface
only what the change touched. A guard you think is now unreachable, a caller you
think breaks, a value you think is never `null` — none of those can be settled
from a diff, and a finding nobody checked against the code that did not change
is a guess with a severity on it. **Read the files.** See the Findings part of
step 5.

```
0 get-instructions   which bodies are on, and an index of what you can ask for
  get-instructions { fields: ["writingStyle", "staticWritingStyle",
                              "documentFormat"] }
                     the voice, how a code link is written, the document's
                     shape and what a write is refused for
1 start { repo, type: "review", pr | branch, context }
                     scaffolds it, walks the blast radius, returns `plan`
2 read { plan, section: "diff" }
                     the whole change, per file, with the ids covering each one
3 nodes { plan, unfilled: true, needs: ["answer", "verdict"] }
   update-nodes { plan, blast }
                     how far the change reaches — before you describe it
4 ask the reader how they want it ordered, and wait for the answer
5 update-document { plan, context, overview, implementation }
6 nodes { plan, unfilled: true } → the next few, code attached
   update-nodes { plan, waypoints | nodes | blast }
   …repeat until `nodes` reports total 0
7 complete { plan }
                     checks it, opens it, or hands back everything still missing
```

**Step 0 is a read, and it comes before the prose.** `get-instructions` with no
arguments returns which of `diagram`, `blast` and `codeWalkthrough` the user
turned off in `sections`, and an **index**: every entry you can ask for, each
saying when to ask for it. A body that is on you write as normal; a body that is
off is optional — do not generate it unless the user asks.

**It returns no prose. Fetch an entry when you reach the work it is about.**
That is the whole design: the rules for writing a diagram are no use while you
are assessing reach, and reading all of them first costs several thousand
tokens before you have written a word.

```
before the first write   { fields: ["writingStyle", "staticWritingStyle",
                                    "documentFormat"] }
before step 3            { fields: ["blast"] }
before step 6            { fields: ["codeWalkthrough.files",
                                    "codeWalkthrough.files.waypoints"] }
before the diagram       { fields: ["diagram"] }
before a finding         { fields: ["findings"] }
```

Fetch the one you are about to use, not the next three. `nodes` tells you which
kind of work is left, and that is what to ask about. The whole surface is
available as `{ all: true }`, and it is large enough that you should not want
it.

**Step 3 comes before every word of prose, and that is the point of it.** The
difference between a change that touches two files and one that is felt in two
hundred is the single most useful thing anybody can know before describing it,
and it is not in the diff. An overview written without it describes a patch; an
overview written with it describes a change.

Every call after `start` takes `plan` and nothing else to say which document it
is about.

**Step 6 is a loop, and it is most of the work.** `nodes` gives you what is
unwritten together with the code it covers and what the change did to those
lines; `update-nodes` writes it back in a batch. Ask again, write again, until
the total reaches zero.

**Creating and refreshing are the same skill, but not the same calls.** `start`
refuses when a walkthrough already exists, and that refusal is correct:
replacing one would discard whatever a human has changed since. So when one
exists, read it with `read { section: "full" }` first — that is what `full` is
for — keep what a person wrote, and put back only what changed.

**Do not scaffold over a walkthrough somebody has been reading.** The scaffold
rebuilds the structure from the diff, which discards the prose written against
the structure it replaces. Refreshing a walkthrough whose branch has moved is a
case for scaffolding again *and* starting the prose again; say so and let the
user decide.

Start over **only when asked to in as many words**, by calling `start` again
with `reset: { confirm: true, discarding: "…" }`. The `discarding` line is
yours to write and says what is about to be thrown away, so the call cannot be
made without having looked. The panel's two prompts say which is which; do the
same when you are asked directly.

## 1. Start it, which scaffolds it

Two facts, and nothing else yet: the repository as `owner/repo`, and **what the
change is called**.

A change has one of two names and they are not interchangeable:

- a **pull request number**, on a host that has pull requests, or
- a **branch**, when it has no pull request yet or the reader is working with
  plain git.

Ask if either is unclear; do not guess from the branch name. The prompt usually
says which — a branch is named as "on branch `<name>`, which has no pull
request". Every Flight Plan tool takes `pr` or `branch`, never both.

**Do not go and look anything up.** No `git remote get-url`, no
`gh auth status`, no `gh pr view`. The head commit, the base commit and the
title are worked out for you by the call below: a branch's head and title come
from the checkout, a pull request's come from whichever host the repository is
on, and the base is the merge base with trunk in both cases.

You may pass any of the three if you already have them — from the user's own
message, say — and only the gaps are filled in. What you must not do is go and
fetch them so that you can pass them.

**Then begin it, in one call. Do not read the code first, and do not ask the
reader anything yet** — the ordering question comes next, and it is a better
question once the scaffold has told you what the change contains.

```
start { repo, type: "review", pr | branch, context }
    → stores the opening, opens the panel, scaffolds it, waits for it,
      and returns the overview: every id, every source, and what is unwritten
```

**One call, and there is nothing to poll.** The scaffold parses and searches
rather than waiting on a language server, so `start` blocks until it is done and
hands back the skeleton. On a large repository it may exceed its budget; then it
says `scaffold: "running"` and you call `read { plan, section: "overview" }`
until it says ready. That is the only case where you wait, and you never poll a
job id.

Until the scaffold finishes, the stored document is the opening and nothing else
— no sections, no waypoints, no diagram. That is **not** a scaffold that found
nothing; it is one that has not got there yet, and the two are identical to look
at. Every read refuses while it is running and says so, rather than handing you
an empty document to draw the wrong conclusion from.

`context` is the only thing you write here; how to write it is
`get-instructions { fields: ["contextBody.context"] }`. It is required, and it is written before you have read a
line of the code — so treat it as a placeholder you owe a rewrite, not as an
answer. Write it from what the reader told you and what the change is called,
and **do not infer it from the branch name**: a checkout is often on a different
branch, and a branch is often named for a different ticket than the change it
carries. **`update-document` takes a better `context` for exactly that**, in
step 5, and you are expected to use it.

The scaffold takes the diff, parses each changed file at the commit, resolves
the calls it finds through the imports in them, searches for what calls them,
and writes the result into the document. Nothing is checked out and no editor is
involved. What comes back already holds

- **a file section per changed file**, in a reading order taken from the call
  graph rather than from the diff;
- **a waypoint per block of changed lines** — one card per hunk, whatever the
  hunk holds, with the `covers` index naming it and a `target` anchored to the
  declaration inside it where there is exactly one. A hunk adding three
  constants side by side is one card, not three. A created file is the
  exception: it arrives as a single hunk, so it is cut at its declarations
  instead;
- **the diagram's nodes**, including every function on the path that the change
  never touched, each with its `sources` and with `changed` already set.

None of that is yours to work out, and none of it is yours to change. Running
`rg` to find what calls a changed function, or `git show` to count which lines a
declaration occupies, is spending calls on an answer the document already
contains — and it is the half of the job you are measurably worse at than the
editor is.

**What the scaffold cannot do, and says so.** `start` returns a `notes` list of
what it could not read. Four kinds turn up:

- *"no grammar for `lib/order.rb`; its section is from the diff alone."*
  Its waypoints are addressed by line range rather than by symbol, which is a
  worse anchor and the reason they are called out. Read those files yourself
  before you write their prose.
- *"No execution path runs through this change."* The change is declarations,
  configuration or types. There is no diagram to fill in, and the one line
  saying why is already in the document.
- *"4 calls in `src/checkout.ts` could not be resolved to a declaration."* A call
  on a value whose type decides it, a module named by a computed specifier, a
  dispatch table. **These are yours to answer** — see below.
- *"the search for callers of … was narrowed because the name is common."* A
  caller reaching that declaration through a re-export may be missing, so its
  trace may start one step deeper than it should.
- *"`src/pricing.test.ts` is a test and has no waypoint and no node."* Set aside
  on purpose: the scaffold applies the test rule in the `codeWalkthrough.files`
  entry for you. Recognising a test by its name is a guess, so where one of them
  is not a test it has no scaffolded section, and its waypoints are yours to
  write like any other.

**Arm nodes arrive unlabelled, in the sense that matters.** Where the branches
could be derived, an `if`/`else` is two sibling nodes and the calls sit inside
the arm that runs them — including an arm that calls nothing, which is on the
board only because the syntax put it there. The scaffold labels them with the
branch as written (`if (user)`, `else`), which is a placeholder in the same way
a function node's label is. Give them the label a reviewer needs — how to write
it is `get-instructions { fields: ["diagram.nodes.label"] }`.

**Answer every call the scaffold could not resolve.** A parser can say what a
file declares and what it imports; it cannot say which `total` is meant by
`order.total()`, which module `import(`./locales/${lang}`)` loads, or what a
dispatch table holds. Rather than guess — a guessed edge is a node nobody
downstream can delete — the scaffold writes each one down as a question with
whatever it could narrow it to, and hands it to you, because **you can read the
code and it can only parse it.** Find where the table is populated, what the
receiver was assigned, which file the directory holds. Then send the answer with
`update-nodes { blast: [{ id, answer }] }` — an answer belongs to the
blast-radius node that asked, so it travels in that list rather than one of its
own:

- `targets` — one declaration, or several when they are genuine alternatives.
  Several are drawn as siblings, which is what siblings already mean here.
- `runtime` — the target is chosen while the program runs, with a note saying
  what chooses it. A true thing to say, and the prose carries what the graph
  cannot.
- `none` — nothing in this repository is reached.

**An answer is required for every one; a target is not.** A finished walkthrough
is refused while any question is unanswered, because an unanswered one and an
unnoticed one look exactly alike. Do not answer `runtime` to clear the list — it
is the right answer only when you looked and that is what you found.

**If it refuses or the scaffold fails**, it says why in one line — most often a
commit this checkout has never fetched, no window open on the repository, or a
pull request its host would not answer for. Fix that, or pass `head`, `base`
and `title` yourself, and call it again. Do not fall back to writing the
structure by hand because the scaffold was inconvenient: a structure you counted
out is the thing this exists to stop.

## 2. Read the change — from the tool, not from git

```
read { plan, section: "diff" }
    → every changed file, its patch, and the ids of the cards covering it
```

**This is the one thing you genuinely have to read, and it is a call rather than
a shell.** Do not run `git diff`, `git show`, `gh pr diff` or open the files.
The patch comes back per file with the node and waypoint ids that cover each
one, so the correlation between "what changed" and "which card explains it" is
already made for you.

`paths` narrows it to particular files and `limit` pages it; `total` says how
many files changed altogether. **If `total` is wildly larger than the change
should be, stop and say so** — it means the base is wrong, and everything you
write from it will describe somebody else's work.

`unmentioned` lists paths whose change no card covers. Usually empty. When it is
not, the scaffold missed something and the reader should be told rather than
have it quietly left out.

You do not need the diff to write an individual card — `nodes` attaches the
covered code to each one. You need it here for the two document-wide sections,
the context and the overview, which are about the change as a whole and which
nothing per-card can tell you.

## 3. Work out how far it reaches — before you describe it

`start` walked the blast radius alongside the scaffold: every declaration that
uses the changed code, directly or through any number of hops, with no cap. What
it cannot do is judge any of it, and that is this step.

```
nodes { plan, unfilled: true, needs: ["answer", "contract", "verdict"] }
update-nodes { plan, blast: [{ id, contract } | { id, changeType, effect }] }
```

`get-instructions { fields: ["blast", "blast.nodes.changeType",
"blast.nodes.effect", "blast.nodes.contract.before", "blast.nodes.contract.now"] }`
says what the board is, which field to fill, why assessing the node where
propagation stops is enough, and how a contract and an effect are worded. Read them before
you write any. The order of the work is this skill's:

1. **The unproven uses first.** Each one may hide a whole subtree, so everything
   you write before they are answered is provisional. Read the code and either
   name what it reaches or say what chooses the target while the program runs.
   Do not answer `runtime` to clear the list.
2. **Then a contract per changed declaration**, which every dependent below it
   is judged against.
3. **Then the verdicts on the dependents**, each with its one line of effect.

`complete` refuses a reachable dependent nobody assessed, so you either assessed
it or you showed the change cannot get to it.

**Then say what you found, in one line, before moving on.** "Twelve
declarations across four files, of which one breaks" is what the reader wants
before they hear anything else, and it is what the rest of your prose should be
written against.

## 4. Ask how they want it ordered — and wait

**Do not write any prose until they answer.** It is the step most often skipped,
and skipping it means guessing at the one thing only the reader knows.

**Ask it now, with the scaffold in front of you.** This is why it comes after
the call rather than before: the document you just read back names every changed
file and the declarations in each, so you can describe the change instead of
asking the reader to describe it to you. The scaffold has already chosen a
reading order — deepest first, so a name is defined before it is met — and their
answer either confirms it or replaces it with `update-document { order }` in the
next step. Nothing you ask here changes the structure, so nothing is blocked by
waiting.

The **structure** is not a question: a file section per file and a waypoint per
block of changed lines. That is the format, it came with the scaffold, and it is the same for a two-file bug fix and a twelve-file refactor.
What is still a question is the order of the sections and where the findings
go.

**Say what the scaffold found, propose one, and offer the others.** Two
sentences, not a form, and every number in them read off the document rather
than guessed:

> This pull request touches 5 files: the stock check, the reservation, the
> order route, and 2 test files. I would order it **foundations first** — the
> stock check, then the code that calls it. I could **follow the request through the system** instead, or
> put the **findings first** if you are reviewing rather than learning it.

What to offer:

- **Foundations first** — the shape that changed, then the code that uses it,
  then the wiring and configuration. The default, and right for a wide change
  where each file stands on its own.
- **Along the path** — the file where control arrives first, then each file the
  change reaches in turn. Best when the change is one idea spread thin, usually
  under about six files.
- **Findings first** — lead with the findings, then the tour. Best when
  they are reviewing rather than learning the code.

**Ask it with `ask-questions`**, the three orders as options and your proposal
first, so the reader answers in Flight Plan. If the tool is not there, ask in
the conversation instead.

Take a one-word answer and get on with it. If they answer something you did not
offer, do that. If they truly do not answer, use your proposal and **say which
you used** in the first line of your reply.

## 5. Write it

**The code comes to you.** You still have to read the change — prose is the
whole of what you are here to write, and a reading cannot be derived from a call
graph. What has gone is the fetching.

```
nodes { plan, unfilled: true }
    → the next few pieces of work, each with:
        needs what to write: reading, title, label or answer
        code the lines that card covers, at the commit the document names
        marks what the change did inside those lines — or that it did nothing
        lineage its ancestors, with the unrelated siblings dropped
```

**Do not run `git show`, `git diff` or `cat` to see a card's code.** It arrives
with the card. A card whose `marks` say `unchanged` is one of the unchanged
callers on the route to the change: its label says what the step *does*, not
what the change did to it. A card whose `marks` say `unknown` is one where the
diff could not be computed at all — say so rather than describing it as
untouched.

**Work the loop until it is empty.** `nodes` returns `total`, which is how much
is left, and there is no page cursor because the list shrinks as you write. Take
a batch, write it with `update-nodes`, ask again.

```
nodes { plan, unfilled: true, limit: 10 }
update-nodes { plan, waypoints: [ … ], nodes: [ … ] }
nodes { plan, unfilled: true } → total falls
…until total is 0
```

`needs` tells you which field to write, so you never have to work out whether a
card wants a title or a reading. `nodes { plan, ids: [ … ] }` fetches particular
cards the same way when you want to re-read one you have already written.

Call `get-instructions { fields: ["writingStyle", "staticWritingStyle",
"documentFormat"] }` first. Between them they carry the voice, how code is
referenced, and the document's shape; this section carries only what is specific
to reviewing a pull request.

**A walkthrough is a JSON document, and you build it in pieces.** The structure
arrived with the scaffold; what is left is the prose, and two decisions.

```
update-document { context } a better one, now you have read the code
update-document { overview } the scenarios that changed
update-document { implementation } a group per place in the code
update-document { findings } omit the field when there is nothing to report
update-document { order } the order a reader walks the files, if you disagree
nodes { unfilled: true } what is left, with the code it covers
update-nodes { waypoints } titles and readings, by waypoint id
update-nodes { nodes } labels and descriptions, by node id
update-nodes { blast } verdicts, contracts, and the answer to an unproven call
complete says you are finished, and checks it
```

**The fill tools write prose and nothing else.** There is no `changed`, no
`children`, no `covers` and no path in any of their shapes, so a structural
change is not something you can express. That is deliberate. An id the document
has not got is refused and nothing is written, so read the document back rather
than guessing at one.

**The split is not yours to change**, and it is no longer purely the diff's.
Hunks that the editor can show sit inside one construct — one statement, one arm
— arrive merged, so a logic block cut in half by a surviving context line is one
card rather than two saying half a thing each. What that cannot see is a
*reason*: two guard clauses added together for the same reason are two
statements, and they still arrive as two cards. If a section reads repetitively,
say so to the user. Do not rewrite it to merge them.

One thing is yours alone, because nothing in the repository can answer it:

- **The reading order.** The scaffold ordered the files so a name is defined
  before it is met. Change it with `update-document { order }` when you have a better
  argument, and leave it alone when you do not.

**The code-reference format is fixed and comes from
`get-instructions { fields: ["staticWritingStyle"] }`; do not restate or work
around it here.** Since the scaffold, the
ranges are already chosen and already correct, so there is nothing for you to
count: a number you typed is a number that can disagree with them.

**The `title` arrives with the change and is not yours to write.** How it is
chosen is `get-instructions { fields: ["documentFormat"] }`; do not improve on
it.

### The context, the overview and the implementation list

Three sections before the diagram, in this order, written with `update-document`:
context, then overview, then implementation. How each is worded is
`get-instructions { fields: ["contextBody.context", "contextBody.overview.when",
"contextBody.overview.then", "contextBody.implementation.label",
"contextBody.implementation.items.text"] }`.

```
update-document { context } the why, written again now the code is behind it
update-document { overview } the scenarios that changed
update-document { implementation } one group per place in the code
```

**Write `context` again here.** The one you passed to `start` was written before
you had read anything; this is the pass that has the code behind it.

Then the diagram and the file sections — both of which the scaffold has already
built. You write their prose with `update-nodes`, and put the files in the
order that was chosen with `update-document { order }` if it differs from the
one the call graph gave.

### The waypoints

**The structure is the scaffold's and the prose is yours.** Each waypoint
arrives with its `target` and its `covers` already set from the diff, and
`update-nodes { waypoints }` writes a title and a reading onto it by id. You
cannot add one, move one or split one.

What a title and a reading say, and how a breakdown is shaped, is
`get-instructions { fields: ["codeWalkthrough.files.waypoints",
"codeWalkthrough.files.waypoints.title",
"codeWalkthrough.files.waypoints.reading"] }`. Read it before the first one, not
after.

**Decide which cards carry `needsAttention`** from
`get-instructions { fields: ["codeWalkthrough.files.waypoints.needsAttention"] }`;
when to flag a card and how to word it are there, and nowhere else.

### The tour's note and the test files

How the tour's `note` is worded, and the rule for test files, are
`get-instructions { fields: ["codeWalkthrough.note", "codeWalkthrough.files"] }`.
The scaffold applies the test rule for you: test files are set aside before
anything reads the diff, unless the change is nothing but tests.

### Findings

Where a finding goes, what each kind means and carries, how a bug is proven and
what a `solution` is are
`get-instructions { fields: ["findings", "findings.kind", "findings.title", "findings.reading", "findings.trace", "findings.solution", "codeWalkthrough.files.waypoints.findings"] }`.
Read them before you write one. A finding on a card is written with
`update-nodes { findings }` by waypoint id; the top-level list is written with
`update-document { findings }`, which replaces the list.

**Findings come out of the same reading as the waypoints.** You are already in
the code the change touched, with the blast radius in front of you; a finding
you did not see while writing the tour is usually one you inferred from the diff
rather than found in the code.

**Checking a finding is the one part of the job the tools cannot hand you.**
`read` and `nodes` surface the diff, and a finding is a claim about the code
*around* the diff. So read the files the change never touched, and put what you
found in the finding's `trace`.

**The checkout may not be the change.** The working tree is on whatever branch
the user happens to have, which for a pull request review is usually *not* the
branch under review. A file you open with a file read is that branch's copy —
for an unchanged file the same bytes, for a changed one the wrong version. Take
changed code from `nodes` and `read`, which serve it at the commit the document
names, and use a file read only for files outside the diff.

## 6. The diagram

Read `get-instructions { fields: ["diagram", "diagram.nodes.label",
"diagram.nodes.description", "diagram.nodes.edges.label"] }` before you write
it — what a node is, the two axes, edges and node types. What follows is only what the scaffold changes about the job.

**The call stack is already drawn.** The scaffold walked it: every function on
the path to the change, including the steps the change never touches, each with
its own lines and with `changed` set from the diff. You are not choosing the
nodes and you cannot add or remove one.

```
placeOrder() → POST /orders → hasStock()
└──────────────── derived ────────────┘
```

What is left to you on the board is prose — a label a reader recognises and a
description — written with `update-nodes { nodes }` by node id.

**Every label the scaffold wrote is a placeholder.** It writes the declaration's
own name into `label` and into `sublabel`, and marks the node `draft`. The
sublabel is then right and needs nothing from you; the **label** is raw code
where a reading should be, and `complete` refuses a board that still carries
them. `nodes { unfilled: true, needs: ["label"] }` lists exactly which. How to
write the label a reader needs is
`get-instructions { fields: ["diagram.nodes.label"] }`.

## 7. Targeting a card's code

**How to target a declaration's covered code — the `symbol` and `focus` forms
and when to reach for each — is
`get-instructions { fields: ["codeWalkthrough.files.waypoints"] }`.** Do not
restate it here.

**The repair text is taken for you**, off the first line of whatever the target
resolves to, and a later read finds the code again by searching for it. That is
why the first line matters: a signature repairs itself, a lone brace or a blank
line cannot. There is no anchor field to write, and a hand-written one is
refused.

## 8. Verify every range before storing anything

For every `focus` you had to write by hand, confirm the range covers what the
prose claims. A range that is merely in bounds is not enough: a stale range
still renders, silently pointing at the wrong code.

Read it back with `nodes { plan, ids: [ … ] }` rather than opening the file —
the card comes back with the lines it actually covers, at the commit the
document names, which is the same thing the panel will draw.

**A `code:` link whose anchor is not inside its range comes back as a
warning.** What the anchor is comes from
`get-instructions { fields: ["staticWritingStyle"] }`. The write still lands,
and the warning means the range has probably moved, usually by a line. Fix it
rather than leaving it.

## 9. Store it, then show it

**The write is checked, and can be refused.** If the document would not read
correctly, the tool stores nothing and returns the problems, each naming the
field it is about:

```
codeWalkthrough.files[0].waypoints[2].code.target: no symbol `hasStok` in `src/tool.ts`. Check the name.
codeWalkthrough.files[1].waypoints[0].code.covers: `src/schema.ts` has 3 hunks in this change, so index 5 names nothing.
contextBody.overview[1].then: the link `code:src/gone.ts#L4` names `src/gone.ts`, which does not exist at 4a12380.
```

Fix exactly the field it names and submit that piece again — through the tool
that owns it, which is `update-nodes` for both a waypoint and a node. Do not
regenerate the whole document over one bad reference, and do not work around a
refusal. Warnings come back alongside a successful write; read them, and act on
the coverage ones.

You have been storing it all along — `start` opened the panel before you wrote
the tour, and every call since added to what the reader can already see. So
there is no final upload. What is left is the one call that says you are
finished:

**Call `complete`.** Until you do, the reader sees a banner saying
the document is still being written, and they are right to: it has only been
checked for the things a half-written document can be checked for. This call is
where the overview, the implementation list, the file sections and every link
are held to the rules.

Two of those rules exist because of the scaffold, and both are about text it
wrote as a placeholder. A waypoint still carrying the scaffold's own title is
refused by id, so a card you never came back to cannot pass as written; and a
diagram node still carrying the scaffold's own label is refused the same way,
because the scaffold writes the declaration name there and a board of raw
identifiers is a board nobody wrote.

If it refuses, it lists exactly what is missing. Nothing is lost — what is
stored stays stored and the reader keeps reading it — so add the missing piece
and call it again.

If `start` reports that a walkthrough already exists, do not retry and do not
work around it. That refusal is what stands between a reviewed walkthrough and
somebody's habit of starting again. Tell the user, and offer either to refresh
it — read it, then put back only the sections that changed — or, if they say to
start over in as many words, to call `start` again with `reset: { confirm: true, discarding: "…" }`.

The panel was opened for them on the first call, so there is nothing to open
again — say that it is open, and has been filling in as you wrote.
