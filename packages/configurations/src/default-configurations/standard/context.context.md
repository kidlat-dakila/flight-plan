### Context

Say why anyone should care, to a reader who has not seen the code.

**This surface bans identifiers, paths and links.** If you cannot write it
without naming a symbol, you are describing the implementation rather than the
change. That ban is what makes it the easiest place to hide a vague verb, so say
what the reader would see: not "the size check handles an oversized query" but
"a query over 1 MB now gets an error that names the 1 MB limit".

Five sentences, and no more even when the change is large. **Verify every claim
against the diff**, never against a pull request's own description.
