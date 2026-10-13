# How to write it

Every review artifact Flight Plan stores is prose beside code. The code is referenced,
never pasted, so **the prose is the whole of what you write** — and the same
voice runs through all of it, from a five-word node label to a four-sentence
reading.

This file is the voice: what every surface has in common. How to word any one
field is that field's own instruction, and the artifact's shape is
`artifactFormat`.

## The test

A reader has the code open beside your sentence. Write what they cannot get from
it: why this runs, and what goes wrong without it. Anything they could
read for themselves is a sentence spent.

The second test is harder and matters more: **could this be checked?** A claim
about code that names the code can be verified by opening it. A claim that names
nothing cannot be, so it never is.

## Voice

Written in [ASD-STE100](https://www.asd-ste100.org) Simplified Technical
English. Six rules carry most of it:

- **One idea per sentence.** Twenty words is long.
- **Active voice.** "`checkSize()` throws `TooLarge`", not "`TooLarge` is thrown".
- **Present tense**, except where the tense table below says otherwise.
- **Plain words over precise ones.**
- **No ambiguous *it*.** Name the thing again.
- **No vague verbs** — *handle*, *manage*, *process*, *support*, *orchestrate*,
  *surface*, *drive*, *deal with*. Each names a topic and leaves out what
  happens. Use the verb the code uses.

**No metaphor for what the code does.** Where the code has an operation, name
the operation. The test is whether the reader can find the word in the code:
they are reading beside it, so a word that is not in it is a word they have to
translate.

- Not "climbs the ancestors" but `element = element.parentElement`, written
  twice if the loop runs twice. Not "bubbles up", "walks the tree", "falls
  through", "bails out", "hands off" — and not "the climb" or "the hand-off"
  either.
- Not "missing" or "never set" but `undefined`, `null` or `""`. Name the value.
- Not "the check wants a clean path" but "`resolvePath()` returns null for a
  path outside the root". Code has no intent.
- Not "the guard", "the gate", "the plumbing" or "the wiring" but the plain word
  for what the code is: a condition, a validation, a check, a function that
  passes the value to `saveOrder()`. Review jargon is a metaphor too.
- Not "refuses", "rejects", "accepts", "allows", "blocks" or "protects" but the
  operation: returns `false`, throws `RangeError`, returns a 400, skips the
  line. A verb of judgement is a metaphor for one of these, and hides which.

A codebase's own nouns are not metaphors for this purpose — a card, a panel, a
board, a waypoint — because the code calls them that and the reader can search
for them. Nor are technical verbs with one meaning: return, throw, parse,
render, call.

A metaphor cannot be checked, which is why it never is. "Four ancestors up"
survived several drafts of this instruction; written out as `<li>` → `<ul>` →
`<div>` it turned out to be three.

**Name the value, never the variable.** A call carries the arguments it was
given on the run you are describing: `` `addToBasket({ id: 7 })` ``,
never `` `addToBasket(payload)` ``. Where a literal will not fit, write the shortest
thing that identifies it — `<div.fp-interlude>`, `[9 ranges]` — but never the
variable name, because that is the one thing the reader cannot resolve.

**Do not narrate the diff.** "This line was changed to…" is about the pull
request. The prose is about the code, and the panel already marks what changed.

**Invent no nouns.** A *post-acquire release* or a *rank direction contract*
names something the codebase does not name, so a reader can neither search for
it nor check it. Both read as precision until somebody tries to use them to find
something.

## Tells

Six habits that mark prose nobody checked. Fix each on sight.

- **The `-ing` rider.** A clause opening *ensuring*, *allowing*, *improving*,
  *providing* or *helping* is a claim tacked onto a verified one. Either it is
  what the code does — say it as the main clause and link it — or cut it.
- **The hedge.** *Likely*, *presumably*, *appears to*, *generally*, *typically*.
  A reading that hedges is a reading nobody opened the file for. What you could
  not resolve is a `question`, or a `risk` whose reading says what stopped you.
- **The sales adjective.** *Robust*, *seamless*, *elegant*, *powerful*,
  *crucial*, *pivotal*. The marks and the `changed` chip carry the emphasis; a
  word insisting on it competes with them.
- **The vague connection.** *Associated with*, *related to*, *tied to*, *works
  with*. Name the relation the code has: calls, reads, returns, throws, wraps.
- **Staging instead of stating.** "This isn't just a check — it's…". Say what it
  is; a sentence that opens with what something is not has spent half itself on
  nothing.
- **Borrowed authority.** *Best practice*, *industry standard*, *the usual
  pattern*. Cite the code, or this repository's own convention with a link, or
  drop the point.

And two smaller ones: **`serves as`, `features`, `boasts`** where *is*, *has* or
the real verb would do; and **a reading that restates its own title**, which
means the title is doing no work or the reading is not.

**None of these reach inside code.** An identifier, a quoted error string, a
value and a finding's solution are exempt from every rule in this file:
`handleRequest()` is a name, not a word choice.

The rest of this file is weighed in context rather than fixed on sight. How long
a reading runs, how much reasoning a description carries, whether a sentence
repeats its neighbour — the code beside it settles those, and no rule can.

Linking code is a fixed part of the writing style, always in force — its rules
are served separately and are not edited here.

## Tense

Titles are past tense — *Added*, *Modified*, *Removed* — because the code
exists.

Descriptions are present tense: they describe code, not work. A waypoint's
reading is the exception: it opens with what the author did, then says in the
present what the code does as a result. Its own instruction has the form.

## Where a reason goes

`context` carries the reason the change exists, and a node's `description`
carries the reason a step is in the path. A waypoint's reading carries the
reason for its own piece of the change — what it is for within the pull request
— and its instruction says how. A constraint or a trade-off beyond that is
worth one sentence at the end of a reading, and nothing more, because a reading
that argues is a reading nobody finishes.

Everything else about a particular field — how to word a title, a label, a
reading, a description, an edge label, a contract, a finding — is that field's
own instruction. Ask for it when you reach the field. It used to be restated
here as well, which meant two copies of every rule and, in the end, two copies
that disagreed.
