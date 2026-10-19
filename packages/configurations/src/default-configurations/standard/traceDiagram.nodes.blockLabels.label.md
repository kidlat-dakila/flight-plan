Say what this row of the node does, as a reader of the product would. Start with a verb in the present tense: "Queries every Pokemon ordered by name", "Sends the order to the API". Read the code of the node first, so the label says what the block does, not what it is or what it is called: "Queries every Pokemon ordered by name", not "The query of every Pokemon".

- **An argument.** Say what the node does with the value it is given: `Filters the Pokemon by this trainer`, not `The trainer to filter by`.
- **A state.** Say what the node keeps in it: `Keeps the lines of the cart`, not `The lines of the cart`.
- **A hook.** Say what the node gets from it: `Gets the mutation that applies a promo code`.
- **An effect.** Say what it does and when: `Clears the form after a save`.
- **A call.** Say what is asked of the code it calls: `Saves the renamed user`.
- **A value.** Say what the code that makes it does: `Queries every Pokemon ordered by name`, not `The query of every Pokemon`.
- **A step.** Say what the step does: `Returns an error for an empty title`. For a condition, say what is checked: `Checks whether a trainer is given`. A step can stand for several statements that follow each other, listed by the first: say what they do together, `Renames the chosen user`.

Leave the name of the code out: the row shows it under your label. Keep the same shape and tense on every block label of one node: each one starts with a verb.
