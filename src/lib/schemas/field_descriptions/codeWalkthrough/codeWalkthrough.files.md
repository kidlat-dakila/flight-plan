The file sections of the tour, in reading order: an array of objects, each a
file `path`, its `summary` lines, its `waypoints`, and an optional `scaffolded`
flag.

## Ordering the files

`codeWalkthrough` is one section per file, in reading order, each with a
`summary` and its waypoints. `summary` is that file's implementation items
again, without the links — the same list, where the reader arrives. `note`
names the whole tour, not the first file.

**Order the files so a reader never meets a name before it is defined.** The
shape that changed first, then the code that uses it, then what wires them
together, then tests and configuration. Following the change through the system
is the other order that answers to a reader; use it when they ask. What neither
can be is alphabetical or diff order.

**No test file gets a waypoint, and none gets a section.** A tour is a tour of
the change, and a test is the evidence the change works. Name the tests once in
`implementation`, with no link. The coverage strip then reports fewer files
covered than changed, which is correct: it is saying which files the tour does
not visit. A change that is **nothing but tests** inverts — they are the change,
and the tour is of them. The two exceptions are findings rather than waypoints:
a test that is itself the defect, and a fix proposed on the card that shows it.

