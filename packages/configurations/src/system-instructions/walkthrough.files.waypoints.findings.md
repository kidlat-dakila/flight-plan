What is wrong with the code this waypoint shows: an array of finding objects,
one per distinct claim. Empty on most waypoints. Writing it replaces the
waypoint's whole list, so send every finding the waypoint should keep.

Each is an `id` unique in the artifact, a `kind` (`bug`, `risk`, `nit` or
`question`, most severe first), a `title`, a `reading`, an optional `trace` of
steps that prove it, and a `solution` — required on a `bug`, a `risk` and a
`nit` in a finished artifact, refused on a `question`.

A finding names no code of its own: its lines are the lines of the waypoint it
hangs on. A `solution` is a string of code and nothing else — it replaces the
lines the waypoint covers, so it names no path and no position, and the reviewer
can preview it against the real file.

The waypoint draws one chip, the highest kind among them.
