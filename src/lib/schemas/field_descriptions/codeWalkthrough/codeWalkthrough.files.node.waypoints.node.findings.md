What is wrong with the code this waypoint shows: an array of finding objects,
one per distinct claim. Optional, and absent on most waypoints.

Each is an `id` unique in the document, a `kind` (`bug`, `risk`, `nit` or
`question`, most severe first), a `title`, a `reading`, an optional `trace` of
steps that prove it, and a `solution` — required on a `bug`, a `risk` and a
`nit` when the waypoint references code, refused on a `question`.

A finding here carries no code fence: its lines are the lines of the waypoint it
hangs on. A `solution` is `{ lang, body }` and nothing else — it replaces the
lines the waypoint covers, so it names no path and no position, and the panel
can preview it against the real file.

The card draws one chip, the highest kind among them.
