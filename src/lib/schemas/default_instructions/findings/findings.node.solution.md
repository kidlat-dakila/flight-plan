### Solution

Every `bug`, `risk` and `nit` carries a solution, unless it has no existing
lines to replace. A `question` carries none: it is not a claim.

Write the lines as they should be, whole, with the indentation they have in the
file. The body replaces every line the finding's code covers, so a line you
leave out of the body is a line the fix deletes.

If the fix needs more than these lines, write the part that belongs to these
lines and name the other lines that must change in the reading, with `code:`
links. Do not widen the finding's code to reach them: the code says where the
defect is, and the solution follows it.
