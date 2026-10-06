### Trace

The steps that prove the finding, in the order the code runs.

The first step is the trigger: name the action and what makes it fire — the
parameter, the state, the condition. "A reader selects a sentence", not
"selection happens"; `POST /orders` with `quantity: 0`, not `POST /orders`. That
step names a user action, so it carries no link.

Every step after it is a debugger step, linked to where it is in the code. A
trace carries the proof and nothing else — no impact, no evidence, no proposal
step. A `nit` and a `question` carry no trace.
