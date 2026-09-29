The blast-radius board: an object with a `type` of `"blast"`, a `nodes` array of
every declaration that uses the changed code, and an optional `edges` array
wiring them. Walked by `start`, not written by you.

A second board, beside the diagram and answering a different question. The
diagram is a **trace**: one path through the change, nested by execution order.
The blast radius is **reach**: every declaration that uses the changed code,
directly or through any number of hops, with no cap.

## Assess the stops, not every node

A change to something widely used reaches hundreds of declarations, and most are
unaffected for one shared reason: the change stops propagating somewhere. Mark
that node `unaffected` and everything reachable only through it takes the same
verdict, derived from the graph and drawn as shielded.

One reading covers a branch, which is what makes assessing an uncapped graph
possible at all — and what makes the gate passable: `complete` refuses a
reachable dependent nobody assessed, so you either assessed it or you showed the
change cannot get to it.

## A node marked `unproven` is a hole, not a verdict

The walk found a use that names the changed code and could not prove the
binding: a computed specifier, a dispatch table, a call on a value. Answer each
with what it reaches, or with what chooses the target at runtime.

`complete` refuses while any is unanswered, because a missing edge takes a whole
subtree off the board and nobody can see an absence.

## What you never write

`via` — the dependencies a verdict was formed against — is this node's own
outgoing edges, so it is derived. The label is the declaration's own name and
stays that way: on a reach graph the name is the identity.

Nothing on this board has entry points. An entry says what starts a trace, and a
blast radius has no trace: it starts at the change, which is already drawn.
