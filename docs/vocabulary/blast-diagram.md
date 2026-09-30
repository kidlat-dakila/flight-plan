# Blast Diagram

## Definition

The Blast Diagram shows everything a change can affect. Where the [Journey Flow Diagram](journey-flow-diagram.md) follows one path in the order the code runs, the Blast Diagram shows every path at once, as rings around the change. It answers the reviewer's second question: if this change is wrong, what else goes wrong with it?

It is drawn from the [codegraph](codegraph.md) as it is: the change at the centre, and everything that reaches it spreading outward. A declaration's ring is its distance from the change, counted in connections along the shortest path.

## Nodes

| Node | Ring | What it stands for |
|---|---|---|
| **Epicenter Node** | 0 | A declaration the diff changed |
| **Direct Impact Node** | 1 | A declaration that uses an Epicenter Node directly |
| **Indirect Impact Node** | 2 and beyond | A declaration that reaches the change only through other declarations |

Nodes declared in the same file are grouped together. A file itself is never a node, because a file does not run.

## What each node says

**An Epicenter Node** states its **contract**: what anyone using it has to know, before and after the change. The contract describes the declaration's surface, not its insides. "Takes an optional `held` on each line; callers that omit it see no change" lets every dependent be judged without opening the file. "Counts held units in the stock check" does not. `before` is empty for a declaration that did not exist.

**A Direct or Indirect Impact Node** states a **verdict** and its **effect**:

| Verdict | Meaning |
|---|---|
| `breaks` | The node cannot work against the changed code: a type error, an exception it does not catch, a contract it violates. |
| `behaviour-changes` | The node still works, and now does something different. |
| `unaffected` | The change cannot reach this node, or reaches it and changes nothing. |

The **effect** is one line of evidence for the verdict, measured against the contract of what the node uses, with a [CodeLink](review-artifact.md#codelink) to the place that does or does not carry the change. A node nobody has assessed has no verdict yet, which is different from `unaffected`.

**A shield** is derived, never written: when a node stops the change from travelling further (for example, it catches the new exception), the nodes beyond it record which node shields them.

## What the reviewer controls

The Blast Diagram receives the same whole trace as the Journey Flow Diagram and can filter it the same way: by ring, by data connections and by connections the codegraph marked as assumed.

## Who writes what

| Part | Written by |
|---|---|
| Which nodes exist, their rings, and how they connect | The codegraph |
| Which nodes are Epicenter Nodes | The diff |
| Shields | Derived from the verdicts and the connections |
| Contracts, verdicts, effects, labels and descriptions | The agent |

The Blast Diagram is optional. An artifact without one is not incomplete: it is an artifact nobody asked that question of, or one that says in a line why there is nothing to show.
