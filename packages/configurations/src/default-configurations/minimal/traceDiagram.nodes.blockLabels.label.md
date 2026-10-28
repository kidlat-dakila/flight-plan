What this row of the node does, as a reader of the product: a verb first,
present tense: "Queries every Pokemon ordered by name", "Sends order to API".
Read the node's code first: label says what the block does, not what it is or
what it is called. "Queries every Pokemon ordered by name", not "Query of every
Pokemon".

**Function card** (function, method, hook, event handler): rows are its
calls, returns and raises.

- **Call**: callee as the code writes it, then what for: `Calls load_trainers
  to read every stored trainer`. Runs only under a condition: condition before
  the purpose, `Calls save_trainer when it is no dry run to store the renamed
  trainer`. Two calls of one callee: two rows.
- **Return**: only or last one, what it gives back: `Returns the renamed
  trainer`. Early or conditional: add when, `Returns the trainer as it is when
  the name does not change`.
- **Raise**: error and when: `Raises a ValueError when the name has a digit`
  (Python), `Throws a RangeError when no trainer has the id` (TypeScript,
  JavaScript).

**Component card**: rows are its calls, memos, effects, returns and render
rows. Each return heads what renders there, its render rows under it.

- **Call**: as on a function card: `Calls useTrainer to load the trainer`.
- **Memo**: what it works out: `Lists each team type once`.
- **Effect**: what it does, when: `Stores trainer id when it changes`.
- **Return**: last one, what renders: `Renders heading and team slots`. Early:
  add when, `Renders loading line when trainer not loaded`. `return null`:
  `Renders nothing when team is empty`.
- **Condition**: what renders, when: `Renders note when team has no Pokemon`.
- **Loop**: what renders for each item: `Renders a span for each badge`.
- **Component**: component as the code writes it, then when or for each what:
  ``Renders `<TeamSlot />` for each team Pokemon``.
- **Value**: what renders, which code drew it:
  `Renders badges that renderBadges drew`.

No label on props, state, or a memo's or effect's dependencies and outside
variables: card shows their code.

**Memo or effect card**: calls and returns as on a function card. Cleanup says
what it stops: `Returns a cleanup that stops watching the team`.

**Any other card** (class, route, router, store):

- **Argument**: what the node does with it: `Filters Pokemon by this trainer`,
  not `Trainer to filter by`.
- **State**: what the node keeps in it: `Keeps cart lines`, not `Cart lines`.
- **Hook**: what the node gets from it: `Gets mutation that applies promo code`.
- **Effect**: what it does, when: `Clears form after save`.
- **Call**: what is asked of the code it calls: `Saves renamed user`.
- **Value**: what the code that makes it does: `Queries every Pokemon ordered by
  name`.
- **Step**: what the step does: `Returns error for empty title`. Condition: what
  is checked. Step standing for several statements: what they do together.

No name of the code, except a call's callee and a render row's component: row
shows it under your label. Same shape and tense on every block label of one
node: each starts with a verb.
