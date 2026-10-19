The File Sections of the tour, in reading order: an array of objects, each a
file `path` and its `waypoints`. A File Section is headed by its path, so it
has nothing to write.

## Ordering the files

**Flight Plan orders the files.** It sorts the File Sections by the import graph,
or puts the reviewer's spotlight and the core changes first, as the reviewer
chose. Write no order.

**No test file gets a waypoint, and none gets a section.** A tour is a tour of
the change, and a test is the evidence the change works. Flight Plan sets test
files aside before it builds the sections, so name the tests once in the
`context`, with no link. A change that is **nothing but tests** inverts:
they are the change, and the tour is of them.

`read { section: "diff" }` lists under `unmentioned` every changed path that has
no File Section. Tell the reviewer about one that should have had a section
rather than leave it quietly out.
