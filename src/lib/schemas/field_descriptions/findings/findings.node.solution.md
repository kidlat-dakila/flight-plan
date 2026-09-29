### Solution

The fix a finding proposes: `{ lang, body }` and nothing else. The body is what
the lines the finding's `code` names should say instead, whole. It replaces
those lines, so it names no path and no position — the finding's `code` is the
position — and the reader can preview it against the real file.

On a document-level finding, the lines are the ones its own `code` names. On a
waypoint's finding, they are the lines of the card it hangs on.

Required on a `bug`, a `risk` and a `nit` whose lines exist. Refused on a
`question`, and on a finding with no existing lines to replace: `code` that is
`null` or a proposal, or a card with no code.
