What is wrong with the code this waypoint shows, on the waypoint itself.

**Only what your reading of the code found.** Finding inferred from the diff
without opening the file: a guess. Verify against the repository, files the
change never touched too. A check three files away may already cover the case.

**Pick the kind honestly.** `bug`: wrong now. `risk`: goes wrong under
conditions you can name. `nit`: worth saying, not worth blocking. `question`:
you do not know. No trace, no fix on a `question`.

Title: what is wrong, one line. Reading: why. Trace: steps that prove it.
`code:` links throughout: every claim resolves to lines.

**Every `bug`, `risk`, `nit` gets a `solution`**: the lines as they should be.
String of code replacing the lines this waypoint covers. No path, no position.
Lines whole: a line left out is a line the fix deletes. Fix needs more than
these lines: write the part that belongs here, name the other lines in the
reading.

Card shows one chip, its highest kind. Nit beside a bug is easy to miss: report
the nit where it belongs.
