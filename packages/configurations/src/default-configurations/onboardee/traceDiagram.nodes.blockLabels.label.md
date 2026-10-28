Say what this row of the node does, as a reader of the product would. Start with a verb in the present tense: "Queries every Pokemon ordered by name", "Sends the order to the API". Read the code of the node first, so the label says what the block does, not what it is or what it is called: "Queries every Pokemon ordered by name", not "The query of every Pokemon".

**On a function card**, the card of a function, a method, a hook or an event handler, the rows you write are its calls, its returns and its raises. Give each kind its own pattern, so the rows read as the story of the function from top to bottom.

- **A call.** Name the callee as the code writes it, then say what the call is for: `Calls load_trainers to read every stored trainer`. When the call only runs under a condition, say the condition before the purpose: `Calls save_trainer when it is no dry run to store the renamed trainer`. Two calls of one callee are two rows, each with its own purpose.
- **A return.** For the only return or the last one, say what the function gives back: `Returns the renamed trainer`. For an early or a conditional return, add when it happens: `Returns the trainer as it is when the name does not change`.
- **A raise.** Name the error and say when it happens: `Raises a ValueError when the name has a digit` in Python, `Throws a RangeError when no trainer has the id` in TypeScript and JavaScript.

**On a component card**, the rows you write are its calls, its memos, its effects, its returns and its render rows. Each return heads what the component renders there, with its render rows under it, so the rows read as what shows on the screen and when.

- **A call.** Write it as on a function card: `Calls useTrainer to load the trainer with their team`, `Calls formatTeamTitle when the trainer is loaded to build the heading`.
- **A memo.** Say in plain words what it works out: `Lists each type of the team once`.
- **An effect.** Say in plain words what it does and when it runs: `Remembers the trainer id after a render with a new id`.
- **A return.** For the last return, say what the component renders: `Renders the heading, the badges and the slots of the team`. For an early return, add when it happens: `Renders a loading line when the trainer is not loaded yet`. For a `return null`, say when nothing shows: `Renders nothing when the team is empty`.
- **A condition.** Say what renders and when: `Renders a note when the team has no Pokemon`.
- **A loop.** Say what renders for each item: `Renders a span for each badge`.
- **A component.** Name the component as the code writes it, then when or for each what: ``Renders `<TeamSlot />` for each Pokemon of the team``, ``Renders `<EmptyTeam />` when the team has no Pokemon``.
- **A value.** Say what renders and which code drew it: `Renders the badges that renderBadges drew`.

Props, state, and the dependencies and the outside variables of a memo or an effect take no label: the card shows their code.

**On the card of a memo or an effect**, beside the component, write its calls and its returns as on a function card: `Calls watchTeam to watch the events of the team`. A cleanup that an effect returns says what it stops: `Returns a cleanup that stops watching the team`.

**On any other card**, a class, a route, a router or a store:

- **An argument.** Say what the node does with the value it is given: `Filters the Pokemon by this trainer`, not `The trainer to filter by`.
- **A state.** Say what the node keeps in it: `Keeps the lines of the cart`, not `The lines of the cart`.
- **A hook.** Say what the node gets from it: `Gets the mutation that applies a promo code`.
- **An effect.** Say what it does and when: `Clears the form after a save`.
- **A call.** Say what is asked of the code it calls: `Saves the renamed user`.
- **A value.** Say what the code that makes it does: `Queries every Pokemon ordered by name`, not `The query of every Pokemon`.
- **A step.** Say what the step does: `Returns an error for an empty title`. For a condition, say what is checked: `Checks whether a trainer is given`. A step can stand for several statements that follow each other, listed by the first: say what they do together, `Renames the chosen user`.

Leave the name of the code out, except for the callee of a call and the component a render row renders: the row shows the name under your label. Keep the same shape and tense on every block label of one node: each one starts with a verb.
