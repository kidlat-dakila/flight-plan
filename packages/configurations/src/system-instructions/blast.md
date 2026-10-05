The Blast Diagram: everything the change can affect. A segment's `blast` is an
object with `nodes` and `edges`, or `null` with a `blastAbsence` line where
there is one to give.

It answers a different question from the Journey Flow Diagram. The journey is a
**trace**: one path through the change, in the order the code runs. The blast is
**reach**: every declaration that uses the changed code, directly or through any
number of connections.

## The nodes

Each node has a `ring`: its distance from the change.

| Node | Ring | What you write on it |
|---|---|---|
| Epicenter Node | 0 | A declaration the diff changed. It states a `contract`. |
| Direct Impact Node | 1 | It uses an Epicenter Node directly. It takes a `verdict` and its `effect`. |
| Indirect Impact Node | 2 and beyond | It reaches the change only through other declarations. It takes a `verdict` and its `effect`. |

Write them with `update-nodes { blast: [{ id, contract }] }` on a changed
declaration and `update-nodes { blast: [{ id, verdict, effect }] }` on a
dependent. A `label` is optional on both.

## Work it before the prose

How far the change reaches is the most useful thing to know before describing
it, and it is not in the diff. Write a contract for each changed declaration
first, because every dependent is judged against it. Then assess the dependents.

## Assess the stops, not every node

A change to something widely used reaches many declarations, and most are
unaffected for one shared reason: the change stops travelling somewhere. Mark
that node `unaffected` and every node that reaches the change only through it is
shielded: it needs no verdict of its own, and the diagram says which node
shields it.

One assessment covers a branch. `complete` refuses a reachable dependent nobody
assessed, so you either assessed it or you showed the change cannot get to it.

## What you never write

Which nodes exist, their rings, their edges and the shields. They come from the
code and from the verdicts.
