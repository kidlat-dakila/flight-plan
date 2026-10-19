Write the reading as the engineer who read the change, telling a colleague what the author did here
and why it matters to the pull request.

**Open with one sentence of a fixed shape**: _The author_ + what they did + what kind of code + what
the change does.

> The author modified a condition in `validateQuantity()` that now returns `false` for a quantity
> over 10, down from 20. [`<BasketForm />`](code:src/checkout/BasketForm.tsx#L40-52) calls it before
> it submits, so the form no longer submits a quantity of 11 to 20.

- **What they did** is one verb, past tense: _added_, _implemented_, _modified_, _removed_,
  _moved_, _replaced_.
- **What kind of code** is the thing the reader will find in the panel, in the plain word for it:
  a function, a method, a condition, a validation, a query, a loop, a type, a component, a
  constant, a test. Then its name. Not review jargon — not a guard, a gate, a hook or wiring —
  because the reader has to translate it back into the code they are looking at.
- **What the change does** is the effect, not the mechanism. Say what is different now — the value
  that moved, the input that now gets an error, the result that is now returned — and name the
  values: from 20 to 10, from a throw to a returned reason.
- **Say what the code does, not a judgement of it.** Not _refuses_, _rejects_, _accepts_, _allows_,
  _blocks_ or _protects_, but the operation: returns `false`, throws `RangeError`, returns a 400,
  skips the line. A verb of judgement hides which of these it is.

**The author is the subject of the change, never of the code.** "The author reads every row" is
wrong: the author read nothing, the code does. After the opening, the code is the subject: "It
reads…", "`validateQuantity()` returns…".

**When the change does more than one thing, list them.** Open with the sentence up to _that_, then
one item per effect, in the order the code does them. Do not chain effects into one sentence with
_and_, _then_ and commas.

> The author added a function `reserveStock()` that:
>
> - reads the stock level of every line in the basket in one query
> - writes one hold per line, which lapses after 15 minutes
> - returns the holds, so that [`placeOrder()`](code:src/checkout/placeOrder.ts#L13-27) can release
>   them when the charge fails

**Do not walk the lines.** The panel shows them. Leave out how the code reaches its effect — the
sort order, the option merge, the loop — unless that detail is the change itself.

**Then say what it is for, against the pull request.** Every reading connects its piece of the
change to the purpose `context` states, usually with _so that_ or _because_. A reviewer who reads
only this card should know why it is in the pull request.

**Take the connection from the Blast Diagram, not from a guess.** Where the artifact has one, `blastDiagram` lists the files
that import the file this card is in, and what the change does to each: its `impactType` and its `impactReason`. Name the one this card exists
for — the form that no longer submits, the route that now returns something else, the caller that now
depends on the new value — and link it. Where nothing outside the change reaches this code, name
what inside the pull request uses it. Where neither the Blast Diagram nor `context` shows a reason,
say what the change does to its consumer and stop: the author's reason is not yours to invent.

**Link code outside the card; name code inside it.** The panel already shows the card's own lines,
so a link to them points at what the reader is looking at. Write those identifiers in backticks
without a link. Link everything else the reading mentions — the caller, the consumer, the type, the
test, the other half of the change in another file — and link every such mention, not the first one.
A link resolves only inside the files the artifact holds, which `codeLinks` lists how to find; name
code in any other file in backticks, with its path.

**A body's reading** (a waypoint with children) says what the author did across the whole body and
why: the opening sentence, a list of at most five items where it does several things, and one
sentence of purpose. **A block's reading** (a child) is the opening sentence about its one block,
with a list only if that block does several things, and its _so that_ points at the body it sits
in or the code that consumes it.

**Do not restate the title.** The title names the change; the reading adds the values, the reason
and what the change connects to. A reading that says the title again at greater length means the
title needs work, not the reading.
