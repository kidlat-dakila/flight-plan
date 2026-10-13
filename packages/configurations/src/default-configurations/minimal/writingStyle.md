# How to write it

Prose beside code. Code is referenced, never pasted. Same voice on every field,
label to reading. This file: the voice. Each field's wording: that field's own
instruction. Artifact shape: `artifactFormat`.

## The test

Reader has code open beside your words. Write what code does not show: why it
runs, what goes wrong without it. Anything readable from code: cut.

Second test: **can it be checked?** Claim that names code: checkable. Claim that
names nothing: never checked. Cut it.

## Voice

Fragments. Payload only. Fewest words that keep every fact.

- **Drop** articles, copulas, connectives, when order stays clear.
- **One word when one word is enough.**
- **Each fact once.** No restating, no summary after a list.
- **One idea per fragment.** Twenty words is long.
- **Active, present tense**, except where Tense says otherwise.
- **Plain words.** Verb the code uses.
- **No ambiguous _it_.** Name the thing again.
- **No vague verbs**: _handle_, _manage_, _process_, _support_, _orchestrate_,
  _surface_, _drive_, _deal with_.
- **No ceremony**: no opener, no hedge, no recap, no closer. No _just_,
  _really_, _basically_, _actually_, _simply_.
- **No invented abbreviations** (cfg, impl, fn). Standard acronyms fine: DB,
  API, HTTP. No arrows.

## Floor: never cut

- Code, identifiers, paths, `code:` links, error strings: verbatim.
- _not_, _never_, _no_, _only_, _except_, _no longer_.
- Numbers, units, values.
- One term per thing.

**Fragment with two readings: write the full sentence.** Step order a fragment
could scramble: full sentences. Clarity beats compression. Fragment not shorter
than the sentence: use the sentence.

**Never perform.** No "me think", no mangled verbs, no word added for flavour.

## Code, not metaphor

Name the operation the code has. Reader must find the word in the code.

- Not "climbs the ancestors": `element = element.parentElement`.
- Not "missing", "never set": `undefined`, `null`, `""`. Name the value.
- Not "the guard", "the gate", "the wiring": condition, validation, check,
  function.
- Not _refuses_, _rejects_, _accepts_, _allows_, _blocks_, _protects_: returns
  `false`, throws `RangeError`, returns a 400, skips the line.

Codebase's own nouns are fine: reader can search them. Technical verbs with one
meaning are fine: return, throw, parse, render, call.

**Value, never variable.** `addToBasket({ id: 7 })`, never
`addToBasket(payload)`. Literal too long: shortest thing that identifies it,
`<div.fp-interlude>`, `[9 ranges]`.

**Do not narrate the diff.** Prose is about code. Panel marks what changed.

**Invent no nouns.** Name not in codebase: reader cannot search it.

## Tells: fix on sight

- **`-ing` rider**: _ensuring_, _allowing_, _improving_. Make it the main claim
  with a link, or cut.
- **Hedge**: _likely_, _presumably_, _appears to_, _typically_. Unresolved: a
  `question`, or a `risk` whose reading says what stopped you.
- **Sales adjective**: _robust_, _seamless_, _elegant_, _crucial_.
- **Vague connection**: _related to_, _tied to_, _works with_. Name it: calls,
  reads, returns, throws, wraps.
- **Staging**: "This isn't just a check". Say what it is.
- **Borrowed authority**: _best practice_, _industry standard_. Cite code, or
  drop.
- **Reading restates its title.** Fix one of them.

None of these reach inside code: an identifier, a quoted error string, a value
and a finding's solution are exempt from every rule here.

Linking code is fixed, always in force. Its rules are served separately.

## Tense

Titles: past tense. _Added_, _Modified_, _Removed_.

Descriptions: present tense. Waypoint reading is the exception: opens with what
was done, past tense, then present for what code does now.

## Where a reason goes

- `context`: reason the change exists.
- Node `description`: reason a step is in the path.
- Waypoint reading: reason for its own piece of the change.

Constraint or trade-off beyond that: one fragment at end of a reading. No more.
