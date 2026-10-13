Report what is wrong with the code this waypoint shows, on the waypoint itself.
A reviewer meets the claim with the code it is about rather than in a list at
the end, which is the whole reason this is here rather than there.

Report only what your reading of the code found. A finding you inferred from the
diff without opening the file is a guess with a chip on it, and the reviewer
cannot tell the difference. Verify it against the repository, including files
the change never touched — a guard three files away may already handle the case
you are about to report.

Pick the kind honestly. `bug` is something that is wrong now. `risk` is
something that will go wrong under conditions you can name. `nit` is worth
saying and not worth blocking on. `question` is you not knowing — a genuine
question, not a suggestion in disguise, and it carries no trace and no fix.

The title says what is wrong in one line, the reading says why, and the trace is
the steps that prove it. Name code with `code:` links throughout, so every claim
resolves to lines a reader can check.

Give every `bug`, `risk` and `nit` a `solution`: the lines as they should be.
It is a string of code that replaces the lines this waypoint covers — no path,
no position, because the waypoint is the position — and the reader can preview
it against the real file.
Write the lines whole, since a line left out of the body is a line the fix
deletes. If the fix needs more than these lines, write the part that belongs
here and name the other lines in the reading.

A card shows one chip, the highest kind it carries, so a bug beside a nit reads
as a bug. That is right, and it is also why a nit reported on the same card as a
bug is easy to miss: report the nit where it belongs.
