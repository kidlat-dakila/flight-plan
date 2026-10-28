# Steps

How the [code blocks](code-blocks.md) inside a declaration are compressed into steps. A block is small: a declared value, a property of an object and the function handed to `.map` are each one. Listing every block would give a node of the [Trace Diagram](../trace-diagram.md) thirteen rows for six lines of code. A step is the unit a reader thinks in: one statement, or a few that belong together.

Two things are made of steps:

| What | Its steps |
|---|---|
| A node of the Trace Diagram that lists its rows as written | Its rows that are steps and calls: every row after the arguments. A [function card](../trace-diagram/function-card.md) has no steps: it lists its calls, its returns and its raises. Neither has a [component card](../trace-diagram/component-card.md), nor an effect card or a memo card. |
| A waypoint of the [Code Walkthrough](../code-walkthrough.md) | Its children |

Both use the same folding, each with rules of its own. [Two readers](#two-readers) lists where they differ.

## The example

```ts
import { getUsers, saveUser } from "./users"
export const renameUser = (param) => {
  const users = getUsers()                                // step 1
  if (!users) throw new Error("no user")                  // step 2
  const user = users.filter((u) => u.id === param.id)     // step 3
  user.name = param.name                                  //   still step 3
  const stored = { id: user.id, meta: { name: user.name } } // still step 3
  for (const one of users) { saveUser(one) }              // step 4, and step 5 inside it when it changed
  try {                                                   // step 6
    saveUser(user)                                        // step 7, when it changed
  } catch (err) {
    throw err                                             // step 8, when it changed
  }
  return users.map((u) => ({ ...u, seen: true }))         // step 9
}
```

These lines hold more than twenty blocks. They are nine steps at most, and six when the calls and the `throw` did not change.

## From a block to its statement

**A step is a statement, not a block inside one.** A block is first replaced by the statement it is written in: the outermost block around it that is one of these, up to the declaration.

| A block that folds what is inside it | Example |
|---|---|
| `variable` | `const user = users.filter((u) => u.id === param.id)` |
| `property` | `items: state.items.map(...)` |
| `call`: a statement that is a call and no other block | `event.preventDefault()`, `mutate({ title })` with the object it is handed |
| A `function` or a `method` with no name, unless it is written in place of an event or a callback | `(u) => u.id === param.id` |

So the parameter `u`, the function handed to `.filter` and the declaration `user` are one statement, `user`. The properties `id`, `meta` and `name` are one statement, `stored`. A change to one property of an object is a change of the statement that holds the object, whether or not anything else in that statement changed.

A block whose parent is none of these is its own statement: a condition, a loop, a `throw`, a function with a name.

**A parameter has no step.** A `variable` whose range is its name alone, such as `state` in `(state) => { ... }`, is a parameter. At the top of a declaration it is no step: in the node of an event or a callback it is a row of the kind argument, and in a waypoint it is dropped. Inside a statement it is folded with the rest.

## A statement that folds, and a step that stands alone

A statement is one of two things.

**A folded statement** is a `variable`, a `property`, a `call` or a nameless function that calls nothing out. It joins the statements beside it into a [run](#runs).

**A step that stands alone** is everything else:

| Stands alone | Because |
|---|---|
| `condition`, `switch`, `switch-case`, `loop`, `try-catch` | It decides what runs. It [holds steps](#inside-a-step-that-holds-steps). |
| A `function` or a `method` with a name | It is invoked from elsewhere. It holds steps too. |
| A statement that calls out | See below |
| `throw` | It leaves the declaration |
| Any other type, such as `deleted` | It is no statement |

**A statement calls out** when it, or a block folded into it, is one of these:

| Calls out | Example |
|---|---|
| An `external-value`: a value kept from a call into other code | `const users = getUsers()` |
| A block the [catalogue](catalogue.md) types: `data`, `data-fetch`, `cache`, `auth`, `request`, `navigation`, `publish`, `storage`, `telemetry`, `transaction`, `validation`, `config`, `feature-flag` | `await fetch(url)` |
| A block that is a node of its own | An effect or a callback of a component, a procedure of a tRPC router |
| A block whose `nextBlocks` lead outside: it is on the way to a change in other code | `createTodo.mutate({ title })`, when the mutation changed |
| A block that calls a function, a hook, a method, a component or a class written outside, or anything it imports from a library | `saveUser(user)`, `[1].map((count) => helper(count))`, `toast.success("Saved")` |

The whole statement is then one step, and a line that leaves a block inside it leaves the row of the statement. A call of a member of a value, such as `users.filter(…)`, `event.preventDefault()` or `createTodo.mutate(…)`, calls out only when the member leads to a block or the call is on the way to a change, so no list of method names is needed.

## Inside a step that holds steps

A block inside a step that holds steps is folded into it, unless all three are true:

1. It is no folded statement: it is a step that stands alone.
2. It has a change, or a block folded into it has one.
3. It is no `throw` inside a `condition`, a `switch`, a `switch-case` or a `loop`.

| Code | Steps |
|---|---|
| `if (!users) throw new Error("no user")` | One. The `throw` is folded into the condition. |
| `for (const one of users) { const price = 1 }` | One. The loop variable and the statement are folded into the loop. |
| `try { ... } catch (err) { throw err }` | Two when the `throw` changed, one when it did not |
| A changed `if` inside a changed `for` | Two |

What is inside a folded statement is always folded, whatever it is: a condition inside a function handed to `.map` is part of that statement.

## Runs

**The folded statements that follow each other are one step.** A run is listed by the block of its first statement, so one label is written for it. Its lines run from the first line of the first statement to the last line of the last. It is named after its first two statements and counts the others: `user, stored`, `one, two +2`.

A run ends at a step that stands alone. Only statements with the same step around them are joined.

## Two readers

| | A node of the Trace Diagram | A waypoint of the Code Walkthrough |
|---|---|---|
| The declaration | The block of the node | The block the waypoint stops at: a root block, or a method of a class |
| The blocks it starts from | The blocks of the node a chain passes through, and its blocks with a change. A call out on a chain is a row though its own line did not change. | The blocks of the declaration with a change |
| Other kinds of row | Arguments, state, hooks and effects are rows of their own kind, and what is inside one is folded into it. A statement that is itself a call out is a row of the kind call. | None. A read from an argument has no step. |
| Holds steps | A condition, a switch, a loop, a `try-catch`, a function with a name | A condition, a switch, a loop, a `try-catch`, and an expression inside markup |
| Holds a body, where statements are joined into runs as at the top | Nothing | A function with a name, and an event, an effect or a callback outside markup |
| Leads outside | A next block in another node | A next block outside the declaration |
| A run also ends | Never | At a line that did not change |
| Markup | No row | Only a `render-condition`, a `render-loop` and a `render-event`, each with all that is inside it |
| One step alone | A row | No child: the waypoint of the declaration covers it |

**An event, an effect and a callback differ most.** In the diagram each is a node of its own inside a component, with rows of its own, and a row of the one node of any other root block. The callback of an effect hook is part of the card of its effect, and a function an event is handed by name is the body of that event: its calls are rows of the event, and it is no step of the node it is declared in. In the walkthrough it is a step of its declaration. It is a child only when its own lines changed, and the changed steps inside it are then its children. When only code inside it changed, it is no step, and those steps are children of the declaration.

For `renameUser`, with every line changed, in a card that lists steps and in its walkthrough. As a function, `renameUser` is a function card, which lists `getUsers()` and `saveUser()` under External calls and the two throws and the `return` under Returns and raises instead.

| Step | Row in a card with steps | Waypoint child |
|---|---|---|
| `const users = getUsers()` | `users` | `renameUser › users` |
| `if (!users) throw …` | `Condition :4` | `renameUser › Condition :4` |
| Lines 5 to 7 | `user, stored` | `renameUser › user, stored` |
| `for (…) { … }` | `Loop :8` | `renameUser › Loop :8` |
| `saveUser(one)` | `saveUser` | None. It would be the only child of `Loop :8`. |
| `try { … } catch { … }` | `Try :9` | `renameUser › Try :9` |
| `saveUser(user)` | `saveUser` | A child of `Try :9` |
| `throw err` | `Throw :12` | A child of `Try :9` |
| `return users.map(…)` | `Function :14` | `renameUser › Function :14` |

## What a step is read from

A step is only as exact as the blocks under it. Five things follow from the blocks there are.

| Fact | What it means for a step |
|---|---|
| An assignment is no block: `user.name = param.name` | It is no step of its own and adds no name to its run, though a run that passes over it covers its line. |
| A call written as the body of an arrow function is no block: `() => save()` | It is part of that function. Only a call that is a statement is a `call`. |
| A step covers the lines of its blocks | A `return { items: … }` is covered from the property `items`, not from `return`. |
| A statement that declares nothing has no name | It is named after its type and its line: `Function :14` for `return users.map(…)`. |
| A change is carried by the innermost block that contains it, as [Chains](chains.md#the-diff-blocks) says | A step is changed when a block folded into it is. A change only the declaration itself holds, such as one on an assignment at its top, marks the declaration and no step. |

## Where it is written

| File | What it holds |
|---|---|
| `packages/codegraph/src/trace-diagram/step-folding.ts` | The folding: `statementOf`, `isStepRow`, `listRuns`, `nameOfRun`, and `StepRules`, the four rules a reader supplies |
| `packages/codegraph/src/trace-diagram/listed-blocks.ts` | The rules of a trace node that is no function card, and its other lists |
| `packages/codegraph/src/code-walkthrough/steps.ts` | The rules of a waypoint, and the tree of its children |
