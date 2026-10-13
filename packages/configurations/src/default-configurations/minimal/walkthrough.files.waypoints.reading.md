What was done here, and why it matters to the pull request.

**Open: fragments, fixed order.** Verb + kind of code + name. Then effect. No
"The author".

> Modified `validateQuantity()` condition. `false` over 10, was 20.
> [`<BasketForm />`](code:src/checkout/BasketForm.tsx#L40-52) calls before
> submit. 11 to 20 no longer submits.

- **Verb**: one, past tense: _added_, _implemented_, _modified_, _removed_,
  _moved_, _replaced_.
- **Kind of code**: plain word from panel: function, method, condition,
  validation, query, loop, type, component, constant, test. Then its name. Not
  guard, gate, hook, wiring.
- **Effect**: what differs now, values named: `false` over 10, was 20. From a
  throw to a returned reason. Not mechanism.
- **Operation, not judgement**: returns `false`, throws `RangeError`, returns a
  400, skips the line. Not _refuses_, _rejects_, _accepts_, _allows_, _blocks_,
  _protects_.

**Author did the change, code does the rest.** After the opening, code is the
subject: "`validateQuantity()` returns".

**Several effects: list them.** Opening fragment, colon, one item per effect, in
the order code does them. No chain of _and_, _then_, commas.

> Added function `reserveStock()`:
>
> - one query, stock level of every basket line
> - one hold per line, lapses after 15 minutes
> - returns holds. [`placeOrder()`](code:src/checkout/placeOrder.ts#L13-27)
>   releases them on failed charge

**Do not walk the lines.** Panel shows them. Leave out how code reaches its
effect, unless that detail is the change.

**End with what it is for.** One fragment tying this piece to the purpose
`context` states: the consumer and what changes for it. Reviewer reading only
this card must know why it is in the pull request. Cause not clear from order of
fragments: write _so_ or _because_.

**Consumer from the Blast Diagram, not a guess.** Where the artifact has one,
`blast` lists files importing this card's file, with `impactType` and
`impactReason`. Name the one this card exists for. Link it. Nothing outside the
change reaches this code: name what inside the pull request uses it. Neither
shows a reason: say what the change does to its consumer, stop. Never invent the
author's reason.

**Link code outside the card. Name code inside it.** Card's own identifiers:
backticks, no link. Everything else mentioned: link, every mention. Link
resolves only inside files the artifact holds, see `codeLinks`. Code in any
other file: backticks, with its path.

**Body's reading** (waypoint with children): what was done across the whole
body. Opening, list of five items at most, one fragment of purpose. **Block's
reading** (a child): opening about its one block, list only when the block does
several things, purpose points at its body or its consumer.

**Do not restate the title.** Reading adds values, reason, what it connects to.
