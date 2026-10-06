The File Sections of the tour, in reading order: an array of objects, each a
file `path`, a `title`, its `summary` lines and its `waypoints`.

Write a section's `title` and `summary` with
`update-nodes { segmentId, files: [{ path, title, summary }] }`. A File Section arrives
titled with its own path, and `complete` refuses one that still is.

## Ordering the files

**Use the order the reviewer chose.** The request that started the review names
it. Where it leaves a choice, order the files so a reader never meets a name
before it is defined: the shape that changed first, then the code that uses it,
then what wires them together, then configuration. What the order can never be
is alphabetical or diff order by accident: the scaffold lists the files by path,
so an order nobody wrote is that.

**No test file gets a waypoint, and none gets a section.** A tour is a tour of
the change, and a test is the evidence the change works. Flight Plan sets test
files aside before it builds the sections, so name the tests once in the
`context`, with no link. A change that is **nothing but tests** inverts:
they are the change, and the tour is of them.

`read { section: "diff" }` lists under `unmentioned` every changed path that has
no File Section. Tell the reviewer about one that should have had a section
rather than leave it quietly out.
