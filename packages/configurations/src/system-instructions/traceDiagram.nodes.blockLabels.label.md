The label of one row of a node, drawn inside the node. On a function card,
and on the card of an effect or a memo, it is a call, a return or a raise:
one row per call into code of the repository, written by the place of the
call, and one per `return`, `throw` or `raise`. It says what the call is for,
what the function returns or what it raises, and under which condition when
there is one. A cleanup an effect returns says what it stops: "Returns a
cleanup that stops watching the team". On a component card it is a call, a
memo, an effect, a return or a render row. A call is written as on a function
card. A memo or an effect says in plain words what it works out or what it
does. A return says what the component renders there: "Renders a loading line
when the trainer is not loaded yet" for an early return, "Renders the heading
and the slots of the team" for the last one, "Renders nothing when the team
is empty" for a `return null`. A render row says what that markup renders and
when, or for each what: "Renders a note when the team has no Pokemon",
"Renders a span for each badge", "Renders `<TeamSlot />` for each Pokemon of
the team", "Renders the badges that renderBadges drew". Props, state,
dependencies and outside variables take no label. On any other card it is an
argument, a state, a hook, an effect, a call or a step, and it says what that
block does in the reader's terms, starting with a verb: what the node does
with the value, or what the step does. A step is a statement with all that is
written inside it, or several statements that follow each other, listed by
the block of the first. Until it is written the row shows the name of the
code, such as `load_trainers()`, `return <section>` or `useApplyPromo`,
marked as a draft.
