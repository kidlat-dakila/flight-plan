The code walkthrough: an object with an optional `note` that frames the whole
tour and a `files` array, one section per file in reading order.

## Reading order

**A tour reads top to bottom, and so does the code it points at.** Files in the
order above; inside a file, bodies as the file declares them; inside a body,
blocks in the order they run.

The rule that makes it checkable: **the marks in one file's section must never
go backwards.** A document that breaks it is refused. A block whose lines
straddle another block is two blocks, whatever they have in common.

